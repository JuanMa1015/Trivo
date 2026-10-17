import { connection } from "next/server";
import {
  json,
  noEncontrado,
  respuestaDeError,
  uuidDeRuta,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  const id = uuidDeRuta((await ctx.params).id);
  if (id === null) return noEncontrado();
  try {
    const servicio = obtenerServicio();
    const numero = await servicio.numeroDe(id);
    const cobro =
      numero === undefined ? undefined : await servicio.obtener(numero);
    // `modo` deja que la pantalla oculte el pago simulado cuando el riel es real.
    return cobro ? json({ cobro, modo: servicio.modo }) : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
