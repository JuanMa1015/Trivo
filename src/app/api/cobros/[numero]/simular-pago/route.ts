import { connection } from "next/server";
import { enteroDeRuta, json, noEncontrado } from "@/server/http";
import { repo } from "@/server/repo";

/** Solo demo: simula la aprobación del pagador. La confirmación real vendrá de Open Payments. */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  await connection();
  const numero = enteroDeRuta((await ctx.params).numero);
  if (numero === null) return noEncontrado();
  const resultado = await repo.simularPago(numero);
  if (resultado.ok) return json({ estado: resultado.estado }, 202);
  return resultado.motivo === "no_encontrado"
    ? noEncontrado()
    : json({ error: "no_disponible", estado: resultado.estado }, 409);
}
