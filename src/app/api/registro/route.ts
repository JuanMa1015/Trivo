import { connection } from "next/server";
import { registroSchema } from "@/lib/perfil";
import { hashClave } from "@/server/clave";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  respuestaDeError,
} from "@/server/http";
import { permitirIntentoDePin } from "@/server/intentos-pin";
import { obtenerServicio } from "@/server/servicio";
import {
  accesoConfigurado,
  accesoRequerido,
  cookieSesion,
  crearSesion,
  pinCorrecto,
} from "@/server/vendedor";

/** Para que la pantalla de registro sepa si ya hay cuenta y si debe pedir el PIN. */
export async function GET() {
  await connection();
  try {
    const { registrado } = await obtenerServicio().perfil();
    return json({ registrado, requierePin: accesoRequerido() });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * Crea la cuenta del comercio (usuario, nombre del comercio y contraseña). Cuando el área
 * del vendedor tiene PIN, el PIN autoriza el registro: solo quien lo tiene puede crear la
 * cuenta, y queda con la sesión abierta.
 */
export async function POST(request: Request) {
  await connection();
  const pide = accesoRequerido();
  if (pide && !accesoConfigurado())
    return json({ error: "acceso_no_configurado" }, 503);
  if (pide && !permitirIntentoDePin(request)) return demasiadasSolicitudes();

  const cuerpo = await leerCuerpo(request, registroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const { usuario, comercio, password, pin } = cuerpo.data;
  if (pide && !pinCorrecto(pin ?? ""))
    return json({ error: "pin_incorrecto" }, 401);

  try {
    const creada = await obtenerServicio().registrarPerfil({
      usuario,
      comercio,
      passwordHash: hashClave(password),
    });
    if (!creada) return json({ error: "ya_registrado" }, 409);
    const respuesta = json({ ok: true, usuario, comercio }, 201);
    if (pide)
      respuesta.headers.append("Set-Cookie", cookieSesion(crearSesion()));
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}
