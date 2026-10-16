import { connection } from "next/server";
import { TOKEN_RE, aprobarSchema } from "@/lib/cobros";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { obtenerServicio } from "@/server/servicio";

const permitirAprobacion = crearLimitador(10, 60_000);

/**
 * El pagador aprueba el precio que vio. Con Open Payments real devuelve a dónde
 * mandar su navegador para dar el consentimiento en su wallet; en demo, el pago
 * queda procesando.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  await connection();
  if (!permitirAprobacion(ipDe(request))) return demasiadasSolicitudes();
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) return noEncontrado();
  const cuerpo = await leerCuerpo(request, aprobarSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const respuesta = await obtenerServicio().aprobar(
      token,
      cuerpo.data.intentoId,
    );
    return json(respuesta, 202);
  } catch (error) {
    return respuestaDeError(error);
  }
}
