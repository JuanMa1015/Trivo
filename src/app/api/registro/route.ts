import { connection } from "next/server";
import { registroSchema } from "@/lib/perfil";
import { hashClave } from "@/server/clave";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  respuestaDeError,
} from "@/server/http";
import { permitirRegistro } from "@/server/limites";
import { obtenerServicio } from "@/server/servicio";
import { cookieSesion, crearSesion, vendedorDe } from "@/server/vendedor";

/** Para que la pantalla sepa si ya hay cuenta abierta y cuántos cobros de invitado se conservarán. */
export async function GET(request: Request) {
  await connection();
  try {
    const perfil = (await vendedorDe(request))?.perfil;
    return json({
      registrado: perfil?.registrado ?? false,
      cobrosCreados: perfil?.cobrosCreados ?? 0,
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * Crea la cuenta (usuario, comercio, contraseña y wallet de cobro). Registro abierto: lo
 * frenan los límites por IP y global. Si quien llama ya era invitado, la cuenta se queda con
 * los cobros que hizo; si no, nace un comercio nuevo.
 */
export async function POST(request: Request) {
  await connection();
  if (!permitirRegistro(request)) return demasiadasSolicitudes();
  const cuerpo = await leerCuerpo(request, registroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const { usuario, comercio, password, wallet } = cuerpo.data;

  try {
    const servicio = obtenerServicio();
    const vendedor = await vendedorDe(request);
    if (vendedor?.perfil.registrado)
      return json({ error: "ya_registrado" }, 409);

    const walletValida = await servicio.validarWallet(wallet);
    const resultado = await servicio.registrarCuenta({
      comercioId: vendedor?.comercioId,
      usuario,
      comercio,
      passwordHash: hashClave(password),
      wallet: walletValida,
    });
    if (!resultado.ok) return json({ error: resultado.motivo }, 409);

    const respuesta = json({ ok: true, usuario, comercio }, 201);
    respuesta.headers.append(
      "Set-Cookie",
      cookieSesion(crearSesion(resultado.comercioId)),
    );
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}
