import { connection } from "next/server";
import { demasiadasSolicitudes, json, noEncontrado } from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { repo } from "@/server/repo";

// 120 consultas por minuto y por IP: cubre el sondeo cada 2 s y frena adivinar códigos.
const permitirConsulta = crearLimitador(120, 60_000);

export async function GET(
  request: Request,
  ctx: { params: Promise<{ codigo: string }> },
) {
  await connection();
  if (!permitirConsulta(ipDe(request))) return demasiadasSolicitudes();
  const { codigo } = await ctx.params;
  const pago = /^\d{6}$/.test(codigo)
    ? await repo.verComoPagador(codigo)
    : undefined;
  return pago ? json({ pago }) : noEncontrado();
}
