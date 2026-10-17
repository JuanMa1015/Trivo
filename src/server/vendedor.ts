import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { json } from "./http";

/**
 * Acceso del vendedor: una clave (VENDEDOR_PIN) que da una cookie firmada y con vencimiento.
 * Sin cuentas todavía: es lo mínimo para no dejar los cobros y sus códigos a la vista.
 * ponytail: una sola clave para todo el comercio; con cuentas reales (Supabase Auth) se
 * reemplaza esta pieza y las rutas siguen llamando a `exigirVendedor`.
 */
export const COOKIE_VENDEDOR = "trivo_vendedor";
export const SESION_VENDEDOR_S = 12 * 60 * 60;
export const PIN_MINIMO = 8;

type Env = Record<string, string | undefined>;

/**
 * Con el riel real el área del vendedor siempre exige clave. En demo (dinero de mentira)
 * queda abierta, salvo que se defina VENDEDOR_PIN.
 */
export function accesoRequerido(env: Env = process.env): boolean {
  return env.COBROS_RAIL === "open-payments" || Boolean(env.VENDEDOR_PIN);
}

/** La clave existe y es lo bastante larga para que adivinarla no sea práctico. */
export function accesoConfigurado(env: Env = process.env): boolean {
  return (env.VENDEDOR_PIN?.length ?? 0) >= PIN_MINIMO;
}

/** La firma depende de la clave: cambiarla cierra todas las sesiones abiertas. */
function llave(env: Env): Buffer {
  return createHash("sha256")
    .update(
      `trivo-vendedor|${env.CONFIRMACION_SECRETO ?? ""}|${env.VENDEDOR_PIN ?? ""}`,
    )
    .digest();
}

const firmar = (cuerpo: string, env: Env) =>
  createHmac("sha256", llave(env)).update(cuerpo).digest("base64url");

const iguales = (a: Buffer, b: Buffer) =>
  a.length === b.length && timingSafeEqual(a, b);

export function pinCorrecto(intento: string, env: Env = process.env): boolean {
  if (!accesoConfigurado(env)) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return iguales(hash(intento), hash(env.VENDEDOR_PIN ?? ""));
}

/** `<vence en segundos>.<firma>`: no lleva datos del vendedor, solo hasta cuándo vale. */
export function crearSesion(
  env: Env = process.env,
  ahora = Date.now(),
): string {
  const vence = String(Math.floor(ahora / 1000) + SESION_VENDEDOR_S);
  return `${vence}.${firmar(vence, env)}`;
}

export function sesionValida(
  token: string | undefined,
  env: Env = process.env,
  ahora = Date.now(),
): boolean {
  if (!token || !accesoConfigurado(env)) return false;
  const partes = token.split(".");
  if (partes.length !== 2 || !/^\d{1,12}$/.test(partes[0])) return false;
  const [vence, firma] = partes;
  return (
    iguales(Buffer.from(firmar(vence, env)), Buffer.from(firma)) &&
    Number(vence) > ahora / 1000
  );
}

export function leerCookie(
  cabecera: string | null,
  nombre: string,
): string | undefined {
  for (const par of cabecera?.split(";") ?? []) {
    const i = par.indexOf("=");
    if (i > 0 && par.slice(0, i).trim() === nombre)
      return par.slice(i + 1).trim();
  }
  return undefined;
}

/**
 * Se llama al inicio de cada ruta del vendedor, no solo en el proxy: la API es la que
 * protege los datos. Devuelve la respuesta de rechazo, o null si puede seguir.
 */
export function exigirVendedor(
  request: Request,
  env: Env = process.env,
  ahora = Date.now(),
): Response | null {
  if (!accesoRequerido(env)) return null;
  if (!accesoConfigurado(env))
    return json({ error: "acceso_no_configurado" }, 503);
  const token = leerCookie(request.headers.get("cookie"), COOKIE_VENDEDOR);
  return sesionValida(token, env, ahora)
    ? null
    : json({ error: "no_autorizado" }, 401);
}

/** Cookie de sesión: solo para HTTP, sin acceso desde scripts y no viaja entre sitios. */
export function cookieSesion(
  token: string,
  env: Env = process.env,
  maxAge = SESION_VENDEDOR_S,
): string {
  const segura = env.APP_BASE_URL?.startsWith("https://") ? "; Secure" : "";
  return `${COOKIE_VENDEDOR}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${segura}`;
}
