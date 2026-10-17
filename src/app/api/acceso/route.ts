import { connection } from "next/server";
import { z } from "zod";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  respuestaDeError,
} from "@/server/http";
import { permitirIntentoDePin } from "@/server/intentos-pin";
import {
  accesoConfigurado,
  accesoRequerido,
  cookieSesion,
  crearSesion,
  pinCorrecto,
} from "@/server/vendedor";

const accesoSchema = z.object({ pin: z.string().min(1).max(128) });

/** Entrar: cambia la clave del vendedor por una cookie de sesión de 12 horas. */
export async function POST(request: Request) {
  await connection();
  if (!accesoRequerido()) return json({ ok: true });
  if (!accesoConfigurado())
    return json({ error: "acceso_no_configurado" }, 503);
  if (!permitirIntentoDePin(request)) return demasiadasSolicitudes();

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
