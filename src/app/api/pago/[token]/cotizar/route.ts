import { connection } from "next/server";
import { TOKEN_RE, cotizarSchema } from "@/lib/cobros";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { obtenerServicio } from "@/server/servicio";

// Cada cotización hace llamadas firmadas con nuestra llave a la wallet del pagador:
// el límite evita que alguien nos use para martillar servidores ajenos.
const permitirCotizacion = crearLimitador(20, 60_000);

/** El pagador pone su wallet y recibe el precio exacto, antes de aprobar nada. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  await connection();
  if (!permitirCotizacion(ipDe(request))) return demasiadasSolicitudes();
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) return noEncontrado();
  const cuerpo = await leerCuerpo(request, cotizarSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const cotizacion = await obtenerServicio().cotizar(
      token,
      cuerpo.data.wallet,
    );
    return json({ cotizacion }, 201);
  } catch (error) {
    return respuestaDeError(error);
  }
}
