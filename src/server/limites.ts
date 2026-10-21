import { crearLimitador, ipDe } from "./rate-limit";

// Cada tope va por IP y también global: la IP la puede inventar quien llame directo al
// puerto (sin proxy delante), así que el global es el que de verdad frena el abuso.
// ponytail: en memoria y por proceso; con varias instancias hay que moverlos a la base.
const HORA = 60 * 60_000;

const invitadoIp = crearLimitador(10, HORA);
const invitadoGlobal = crearLimitador(300, HORA);
const registroIp = crearLimitador(5, HORA);
const registroGlobal = crearLimitador(100, HORA);
const accesoIp = crearLimitador(10, 5 * 60_000);
const accesoGlobal = crearLimitador(200, 5 * 60_000);
const accesoUsuario = crearLimitador(8, 15 * 60_000);

/** Cada visitante nuevo que cobra crea un comercio: se limita para no llenar la base. */
export const permitirInvitado = (request: Request) =>
  invitadoIp(ipDe(request)) && invitadoGlobal("global");

export const permitirRegistro = (request: Request) =>
  registroIp(ipDe(request)) && registroGlobal("global");

/** Un intento de iniciar sesión: tope por IP, global y por usuario (frena adivinar una clave). */
export const permitirAcceso = (request: Request, usuario: string) =>
  accesoIp(ipDe(request)) &&
  accesoGlobal("global") &&
  accesoUsuario(usuario.toLowerCase());
