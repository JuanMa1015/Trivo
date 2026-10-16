import { connection } from "next/server";
import { eventoClienteSchema } from "@/lib/cobros";
import { enteroDeRuta, json, leerCuerpo, noEncontrado } from "@/server/http";
import { repo } from "@/server/repo";

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
  return (await repo.registrarDelCliente(numero, cuerpo.data.tipo))
    ? json({ ok: true }, 201)
    : noEncontrado();
}
