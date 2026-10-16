import type { ZodType } from "zod";

const SIN_CACHE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: SIN_CACHE });
}

export const noEncontrado = () => json({ error: "no_encontrado" }, 404);
export const demasiadasSolicitudes = () =>
  json({ error: "demasiadas_solicitudes" }, 429);

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

/** Número entero positivo de un segmento de ruta, o null. */
export function enteroDeRuta(valor: string): number | null {
  return /^\d{1,9}$/.test(valor) ? Number(valor) : null;
}
