import { connection } from "next/server";
import {
  json,
  noEncontrado,
  respuestaDeError,
  uuidDeRuta,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { vendedorDe } from "@/server/vendedor";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const id = uuidDeRuta((await ctx.params).id);
  if (id === null) return noEncontrado();
  try {
    const vendedor = await vendedorDe(request);
    if (!vendedor) return noEncontrado();
    const { comercioId } = vendedor;
    const servicio = obtenerServicio();
    const numero = await servicio.numeroDe(comercioId, id);
    const cobro =
      numero === undefined
        ? undefined
        : await servicio.obtener(comercioId, numero);
    // `modo` deja que la pantalla oculte el pago simulado cuando el riel es real.
    return cobro ? json({ cobro, modo: servicio.modo }) : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
