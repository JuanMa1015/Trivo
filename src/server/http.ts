import type { ZodType } from "zod";
import { ErrorPago, type CodigoError } from "./open-payments/errores";

const SIN_CACHE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: SIN_CACHE });
}

export const noEncontrado = () => json({ error: "no_encontrado" }, 404);
export const demasiadasSolicitudes = () =>
  json({ error: "demasiadas_solicitudes" }, 429);

const ESTADO_HTTP: Record<CodigoError, number> = {
  wallet_invalida: 400,
  wallet_no_permitida: 422,
  moneda_no_soportada: 422,
  cobro_no_disponible: 409,
  cotizacion_vencida: 409,
  intento_no_encontrado: 404,
  retorno_invalido: 400,
  consentimiento_rechazado: 409,
  open_payments_fallo: 502,
};

/**
 * Convierte un error del flujo de pago en una respuesta con un código estable.
 * Nunca devuelve el mensaje interno ni detalles de la wallet; lo inesperado
 * se registra en el servidor y sale como 500 genérico.
 */
export function respuestaDeError(error: unknown): Response {
  if (error instanceof ErrorPago) {
    return json({ error: error.codigo }, ESTADO_HTTP[error.codigo]);
  }
  console.error("error no controlado en la API", error);
  return json({ error: "error_interno" }, 500);
}

/** Lee y valida el cuerpo JSON; devuelve la respuesta de error si no es válido. */
export async function leerCuerpo<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; respuesta: Response }> {
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return { ok: false, respuesta: json({ error: "json_invalido" }, 400) };
  }
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    return { ok: false, respuesta: json({ error: "datos_invalidos" }, 400) };
  }
  return { ok: true, data: resultado.data };
}

/** Id aleatorio (UUID) de un segmento de ruta, o null. */
export function uuidDeRuta(valor: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    valor,
  )
    ? valor
    : null;
}
