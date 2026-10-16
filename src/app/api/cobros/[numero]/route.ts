import { connection } from "next/server";
import { enteroDeRuta, json, noEncontrado } from "@/server/http";
import { repo } from "@/server/repo";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ numero: string }> },
) {
  await connection();
  const numero = enteroDeRuta((await ctx.params).numero);
  const cobro = numero === null ? undefined : await repo.obtener(numero);
  return cobro ? json({ cobro }) : noEncontrado();
}
