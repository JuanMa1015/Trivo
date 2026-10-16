import { connection } from "next/server";
import { crearCobroSchema } from "@/lib/cobros";
import { json, leerCuerpo } from "@/server/http";
import { repo } from "@/server/repo";

// ponytail: sin autenticación del comercio todavía; añadir Supabase Auth antes de exponerlo.

export async function GET() {
  await connection();
  return json({ cobros: await repo.listar() });
}

export async function POST(request: Request) {
  await connection();
  const cuerpo = await leerCuerpo(request, crearCobroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const cobro = await repo.crear(cuerpo.data.monto, cuerpo.data.concepto);
  return json({ cobro }, 201);
}
