import { connection } from "next/server";
import {
  enteroDeRuta,
  json,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";

/**
 * Solo demo: simula la aprobación del pagador. Con Open Payments real no existe
 * (responde 404): nadie puede dar un cobro por pagado sin que llegue el dinero.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  await connection();
  const servicio = obtenerServicio();
  if (servicio.modo !== "demo") return noEncontrado();
  const numero = enteroDeRuta((await ctx.params).numero);
  if (numero === null) return noEncontrado();
  try {
    const resultado = await servicio.simularPago(numero);
    if (resultado.ok) return json({ estado: resultado.estado }, 202);
    return resultado.motivo === "no_encontrado"
      ? noEncontrado()
      : json({ error: "no_disponible", estado: resultado.estado }, 409);
  } catch (error) {
    return respuestaDeError(error);
  }
}
