import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Contraseña con scrypt y sal propia: `scrypt$<sal>$<hash>` en base64url. Nunca se guarda
 * ni se registra la clave en claro.
 */
const LARGO = 64;

export function hashClave(clave: string): string {
  const sal = randomBytes(16);
  const hash = scryptSync(clave, sal, LARGO);
  return `scrypt$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export function claveCorrecta(clave: string, almacenada: string): boolean {
  const [esquema, sal, hash] = almacenada.split("$");
  if (esquema !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64url");
  const actual = scryptSync(
    clave,
    Buffer.from(sal, "base64url"),
    esperado.length,
  );
  return esperado.length > 0 && timingSafeEqual(esperado, actual);
}
