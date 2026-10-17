import { connection } from "next/server";
import { z } from "zod";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  respuestaDeError,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import {
  accesoConfigurado,
  accesoRequerido,
  cookieSesion,
  crearSesion,
  pinCorrecto,
} from "@/server/vendedor";

// Dos topes: por IP y uno global. La IP la puede inventar quien llame directo al puerto
// (sin proxy delante), así que el tope global es el que de verdad frena adivinar la clave.
const porIp = crearLimitador(5, 60_000);
const global = crearLimitador(20, 60_000);

const accesoSchema = z.object({ pin: z.string().min(1).max(128) });

/** Entrar: cambia la clave del vendedor por una cookie de sesión de 12 horas. */
export async function POST(request: Request) {
  await connection();
  if (!accesoRequerido()) return json({ ok: true });
  if (!accesoConfigurado())
    return json({ error: "acceso_no_configurado" }, 503);
  if (!porIp(ipDe(request)) || !global("global"))
    return demasiadasSolicitudes();

  const cuerpo = await leerCuerpo(request, accesoSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    if (!pinCorrecto(cuerpo.data.pin))
      return json({ error: "pin_incorrecto" }, 401);
    const respuesta = json({ ok: true });
    respuesta.headers.append("Set-Cookie", cookieSesion(crearSesion()));
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}

/** Salir: borra la cookie. */
export async function DELETE() {
  await connection();
  const respuesta = json({ ok: true });
  respuesta.headers.append("Set-Cookie", cookieSesion("", process.env, 0));
  return respuesta;
}
