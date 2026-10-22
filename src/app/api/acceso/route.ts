import { connection } from "next/server";
import { accesoSchema } from "@/lib/perfil";
import { claveCorrecta, hashClave } from "@/server/clave";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  respuestaDeError,
} from "@/server/http";
import { permitirAcceso } from "@/server/limites";
import { obtenerServicio } from "@/server/servicio";
import { cookieSesion, crearSesion } from "@/server/vendedor";

// Se compara contra esto cuando el usuario no existe, para que tardar lo mismo no delate quién tiene cuenta.
let hashFalso: string | undefined;

/** Entrar con usuario y contraseña: abre la sesión de ese comercio. */
export async function POST(request: Request) {
  await connection();
  const cuerpo = await leerCuerpo(request, accesoSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const { usuario, password } = cuerpo.data;
  if (!permitirAcceso(request, usuario)) return demasiadasSolicitudes();
  try {
    const cuenta = await obtenerServicio().cuentaDe(usuario);
    hashFalso ??= hashClave("trivo-sin-cuenta");
    const correcta = claveCorrecta(password, cuenta?.passwordHash ?? hashFalso);
    if (!cuenta || !correcta)
      return json({ error: "credenciales_incorrectas" }, 401);
    const respuesta = json({ ok: true });
    respuesta.headers.append(
      "Set-Cookie",
      cookieSesion(crearSesion(cuenta.comercioId)),
    );
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
