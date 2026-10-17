import { connection } from "next/server";
import { eventoClienteSchema } from "@/lib/cobros";
import {
  json,
  leerCuerpo,
  noEncontrado,
  respuestaDeError,
  uuidDeRuta,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

/** Eventos de trazabilidad que origina la interfaz del vendedor (compartir, copiar). */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  const id = uuidDeRuta((await ctx.params).id);
  if (id === null) return noEncontrado();
  const cuerpo = await leerCuerpo(request, eventoClienteSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const servicio = obtenerServicio();
    const numero = await servicio.numeroDe(id);
    if (numero === undefined) return noEncontrado();
    return (await servicio.registrarEvento(numero, cuerpo.data.tipo))
      ? json({ ok: true }, 201)
      : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
