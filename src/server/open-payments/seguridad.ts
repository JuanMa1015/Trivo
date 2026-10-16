import { createHash, timingSafeEqual } from "node:crypto";
import { ErrorPago } from "./errores";

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const SUFIJOS_INTERNOS = [".localhost", ".local", ".internal", ".lan", ".home"];

/** Un host público con nombre: ni IP, ni localhost, ni sufijos de red interna. */
function esHostPublico(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    IPV4.test(h) ||
    h.includes(":") ||
    h.startsWith("[")
  ) {
    return false;
  }
  return !SUFIJOS_INTERNOS.some((s) => h.endsWith(s)) && h.includes(".");
}

function parsearHttps(url: string): URL {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ErrorPago("wallet_invalida", "URL inválida");
  }
  if (u.protocol !== "https:" || u.username || u.password) {
    throw new ErrorPago(
      "wallet_invalida",
      "Debe ser https:// y sin credenciales",
    );
  }
  if (u.port && u.port !== "443") {
    throw new ErrorPago("wallet_invalida", "Puerto no permitido");
  }
  return u;
}

/**
 * Wallet address escrita por el pagador. Nuestro servidor la consulta, así que
 * solo se aceptan hosts de la lista permitida (si hay) y nunca redes internas.
 * Devuelve la URL normalizada: sin barra final, sin query ni fragmento.
 * ponytail: no resuelve DNS; la lista de hosts permitidos es la defensa real contra SSRF.
 */
export function validarUrlWallet(
  url: string,
  hostsPermitidos: readonly string[] = [],
): string {
  const u = parsearHttps(url);
  if (!esHostPublico(u.hostname)) {
    throw new ErrorPago("wallet_invalida", "Host no permitido");
  }
  if (
    hostsPermitidos.length > 0 &&
    !hostsPermitidos.includes(u.hostname.toLowerCase())
  ) {
    throw new ErrorPago(
      "wallet_no_permitida",
      `Wallet de ${u.hostname} no admitida`,
    );
  }
  return `https://${u.host}${u.pathname.replace(/\/+$/, "")}`;
}

/** authServer y resourceServer que declara una wallet: también deben ser https y públicos. */
export function validarUrlServidor(url: string): string {
  const u = parsearHttps(url);
  if (!esHostPublico(u.hostname)) {
    throw new ErrorPago("wallet_invalida", "Servidor no permitido");
  }
  return url.replace(/\/+$/, "");
}

/**
 * Hash que el servidor de autorización añade al retorno (GNAP):
 * base64url(sha256(nonceCliente \n nonceAs \n interact_ref \n URL del grant)).
 * Comprueba que el regreso del navegador es de la interacción que iniciamos.
 * Acepta la URL del grant con o sin barra final.
 */
export function verificarHashInteraccion(args: {
  nonceCliente: string;
  nonceAs: string;
  interactRef: string;
  authServerUrl: string;
  hash: string;
}): boolean {
  const base = args.authServerUrl.replace(/\/+$/, "");
  const recibido = Buffer.from(args.hash);
  return [base, `${base}/`].some((grantUrl) => {
    const esperado = Buffer.from(
      createHash("sha256")
        .update(
          `${args.nonceCliente}\n${args.nonceAs}\n${args.interactRef}\n${grantUrl}`,
        )
        .digest("base64url"),
    );
    return (
      esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
    );
  });
}
