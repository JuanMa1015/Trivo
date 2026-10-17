import { crearLimitador, ipDe } from "./rate-limit";

// Dos topes: por IP y uno global. La IP la puede inventar quien llame directo al puerto
// (sin proxy delante), así que el tope global es el que de verdad frena adivinar el PIN.
const porIp = crearLimitador(5, 60_000);
const global = crearLimitador(20, 60_000);

/** Cuenta un intento de PIN (al entrar o al registrarse). Falso si ya se pasó del tope. */
export function permitirIntentoDePin(request: Request): boolean {
  return porIp(ipDe(request)) && global("global");
}
