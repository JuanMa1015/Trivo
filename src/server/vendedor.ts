import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { secretoConfirmacion } from "./confirmacion";
import type { Perfil } from "@/lib/perfil";
import { json, uuidDeRuta } from "./http";
import { obtenerServicio } from "./servicio";

/**
 * Sesión del vendedor: una cookie firmada que dice a qué comercio pertenece (`<comercio>.<vence>.<firma>`).
 * La usa por igual el invitado (aún sin cuenta) y quien inició sesión con usuario y contraseña;
 * cada ruta del vendedor lee de aquí el comercio y filtra todo por él.
 */
export const COOKIE_VENDEDOR = "trivo_vendedor";
/** Un invitado necesita días para usar sus 5 cobros; la cuenta usa la misma duración. */
export const SESION_VENDEDOR_S = 30 * 24 * 60 * 60;

type Env = Record<string, string | undefined>;

/** La firma depende del secreto del servidor: cambiarlo cierra todas las sesiones. */
function llave(env: Env): Buffer {
  return createHash("sha256")
    .update(`trivo-sesion|${secretoConfirmacion(env)}`)
    .digest();
}

const firmar = (cuerpo: string, env: Env) =>
  createHmac("sha256", llave(env)).update(cuerpo).digest("base64url");

const iguales = (a: Buffer, b: Buffer) =>
  a.length === b.length && timingSafeEqual(a, b);

export function crearSesion(
  comercioId: string,
  env: Env = process.env,
  ahora = Date.now(),
): string {
  const cuerpo = `${comercioId}.${Math.floor(ahora / 1000) + SESION_VENDEDOR_S}`;
  return `${cuerpo}.${firmar(cuerpo, env)}`;
}

/** El comercio de una cookie válida y vigente, o undefined. */
export function comercioDeSesion(
  token: string | undefined,
  env: Env = process.env,
  ahora = Date.now(),
): string | undefined {
  if (!token) return undefined;
  const partes = token.split(".");
  if (partes.length !== 3) return undefined;
  const [comercioId, vence, firma] = partes;
  if (!uuidDeRuta(comercioId) || !/^\d{1,12}$/.test(vence)) return undefined;
  const valida = iguales(
    Buffer.from(firmar(`${comercioId}.${vence}`, env)),
    Buffer.from(firma),
  );
  return valida && Number(vence) > ahora / 1000 ? comercioId : undefined;
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

/** El comercio de la petición, según su cookie; undefined si no hay sesión. */
export function comercioDe(
  request: Request,
  env: Env = process.env,
  ahora = Date.now(),
): string | undefined {
  return comercioDeSesion(
    leerCookie(request.headers.get("cookie"), COOKIE_VENDEDOR),
    env,
    ahora,
  );
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

/**
 * El vendedor de la petición: su comercio y su perfil. Nulo si no hay sesión o si el comercio
 * ya no existe (por ejemplo, la demo en memoria se reinició): se trata como un visitante nuevo.
 */
export async function vendedorDe(
  request: Request,
): Promise<{ comercioId: string; perfil: Perfil } | undefined> {
  const comercioId = comercioDe(request);
  if (!comercioId) return undefined;
  const perfil = await obtenerServicio().perfil(comercioId);
  return perfil ? { comercioId, perfil } : undefined;
}

export const sinSesion = () => json({ error: "no_autorizado" }, 401);
