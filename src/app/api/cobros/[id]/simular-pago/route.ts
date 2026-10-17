import { connection } from "next/server";
import {
  json,
  noEncontrado,
  respuestaDeError,
  uuidDeRuta,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

/**
 * Solo demo: simula la aprobación del pagador. Con Open Payments real no existe
 * (responde 404): nadie puede dar un cobro por pagado sin que llegue el dinero.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const servicio = obtenerServicio();
  if (servicio.modo !== "demo") return noEncontrado();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  const id = uuidDeRuta((await ctx.params).id);
  if (id === null) return noEncontrado();
  try {
    const numero = await servicio.numeroDe(id);
    if (numero === undefined) return noEncontrado();
    const resultado = await servicio.simularPago(numero);
    if (resultado.ok) return json({ estado: resultado.estado }, 202);
    return resultado.motivo === "no_encontrado"
      ? noEncontrado()
      : json({ error: "no_disponible", estado: resultado.estado }, 409);
  } catch (error) {
    return respuestaDeError(error);
  }
}
