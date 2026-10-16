import { createHmac, randomBytes, randomInt } from "node:crypto";
import { TOKEN_BYTES } from "@/lib/cobros";

/** Secreto del link y el QR: 128 bits, imposible de adivinar. */
export const nuevoToken = (): string =>
  randomBytes(TOKEN_BYTES).toString("base64url");

/** Código de 6 dígitos para decir en voz alta; criptográficamente aleatorio. */
export const nuevoCodigo = (): string =>
  String(randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * Código de confirmación de 4 dígitos que aparece, igual, en la pantalla del
 * pagador y en la del vendedor cuando el dinero llegó. Lo firma el servidor con
 * un secreto: una página falsa puede dibujar un "pago exitoso", pero no puede
 * producir este código. Si el pagador y el vendedor ven el mismo, el pago es real.
 */
export function codigoConfirmacion(
  secreto: string,
  cobro: { id: string; monto: number; pagadoEn: string },
): string {
  const mac = createHmac("sha256", secreto)
    .update(`${cobro.id}|${cobro.monto}|${cobro.pagadoEn}`)
    .digest();
  return String(mac.readUInt32BE(0) % 10_000).padStart(4, "0");
}

let secretoDeProceso: string | undefined;

/**
 * CONFIRMACION_SECRETO (mínimo 32 caracteres). En producción con Open Payments
 * real es obligatorio; en demo y desarrollo se usa uno aleatorio por proceso.
 */
export function secretoConfirmacion(
  env: Record<string, string | undefined> = process.env,
): string {
  const configurado = env.CONFIRMACION_SECRETO;
  if (configurado) {
    if (configurado.length < 32) {
      throw new Error("CONFIRMACION_SECRETO debe tener al menos 32 caracteres");
    }
    return configurado;
  }
  if (env.NODE_ENV === "production" && env.COBROS_RAIL === "open-payments") {
    throw new Error(
      "Falta CONFIRMACION_SECRETO (obligatorio con Open Payments real)",
    );
  }
  return (secretoDeProceso ??= randomBytes(32).toString("hex"));
}
