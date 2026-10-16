import { connection } from "next/server";
import { aprobarSchema } from "@/lib/cobros";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  noEncontrado,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { repo } from "@/server/repo";

const permitirAprobacion = crearLimitador(10, 60_000);

/** El pagador pide aprobar. En producción aquí empieza el grant interactivo de Open Payments. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ codigo: string }> },
) {
  await connection();
  if (!permitirAprobacion(ipDe(request))) return demasiadasSolicitudes();
  const { codigo } = await ctx.params;
  if (!/^\d{6}$/.test(codigo)) return noEncontrado();
  const cuerpo = await leerCuerpo(request, aprobarSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const resultado = await repo.aprobarComoPagador(codigo, cuerpo.data.wallet);
  if (resultado.ok) return json({ estado: resultado.estado }, 202);
  return resultado.motivo === "no_encontrado"
    ? noEncontrado()
    : json({ error: "no_disponible", estado: resultado.estado }, 409);
}
