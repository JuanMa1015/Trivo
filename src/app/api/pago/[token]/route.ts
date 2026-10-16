import { connection } from "next/server";
import { TOKEN_RE } from "@/lib/cobros";
import {
  demasiadasSolicitudes,
  json,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { obtenerServicio } from "@/server/servicio";

// 120 consultas por minuto y por IP: cubre el sondeo cada segundo de una pantalla abierta.
// El token es de 128 bits: no se puede adivinar, así que el límite solo evita abuso.
const permitirConsulta = crearLimitador(120, 60_000);

export async function GET(
  request: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  await connection();
  if (!permitirConsulta(ipDe(request))) return demasiadasSolicitudes();
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) return noEncontrado();
  try {
    const pago = await obtenerServicio().verComoPagador(token);
    return pago ? json({ pago }) : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
