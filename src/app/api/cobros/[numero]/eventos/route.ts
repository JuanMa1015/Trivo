import { connection } from "next/server";
import { eventoClienteSchema } from "@/lib/cobros";
import {
  enteroDeRuta,
  json,
  leerCuerpo,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";

/** Eventos de trazabilidad que origina la interfaz del vendedor (compartir, copiar). */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  await connection();
  const numero = enteroDeRuta((await ctx.params).numero);
  if (numero === null) return noEncontrado();
  const cuerpo = await leerCuerpo(request, eventoClienteSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    return (await obtenerServicio().registrarEvento(numero, cuerpo.data.tipo))
      ? json({ ok: true }, 201)
      : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
