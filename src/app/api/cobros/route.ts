import { connection } from "next/server";
import { crearCobroSchema } from "@/lib/cobros";
import { json, leerCuerpo, respuestaDeError } from "@/server/http";
import { obtenerServicio } from "@/server/servicio";

// ponytail: sin autenticación del comercio todavía; añadir Supabase Auth antes de exponerlo.

export async function GET() {
  await connection();
  try {
    return json({ cobros: await obtenerServicio().listar() });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function POST(request: Request) {
  await connection();
  const cuerpo = await leerCuerpo(request, crearCobroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const cobro = await obtenerServicio().crearCobro(
      cuerpo.data.monto,
      cuerpo.data.concepto,
    );
    return json({ cobro }, 201);
  } catch (error) {
    return respuestaDeError(error);
  }
}
