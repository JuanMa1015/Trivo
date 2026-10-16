import { connection } from "next/server";
import {
  enteroDeRuta,
  json,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  await connection();
  const numero = enteroDeRuta((await ctx.params).numero);
  if (numero === null) return noEncontrado();
  try {
    const servicio = obtenerServicio();
    const cobro = await servicio.obtener(numero);
    // `modo` deja que la pantalla oculte el pago simulado cuando el riel es real.
    return cobro ? json({ cobro, modo: servicio.modo }) : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
