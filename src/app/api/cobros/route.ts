import { connection } from "next/server";
import { crearCobroSchema } from "@/lib/cobros";
import { json, leerCuerpo, respuestaDeError } from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

// Acceso del vendedor por clave (ver server/vendedor.ts); con cuentas reales vendrá Supabase Auth.

export async function GET(request: Request) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  try {
    return json({ cobros: await obtenerServicio().listar() });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function POST(request: Request) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  const cuerpo = await leerCuerpo(request, crearCobroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const servicio = obtenerServicio();
    const perfil = await servicio.perfil();
    if (!perfil.registrado && perfil.cobrosCreados >= perfil.limite)
      return json({ error: "registro_requerido" }, 403);
    const cobro = await servicio.crearCobro(
      cuerpo.data.monto,
      cuerpo.data.concepto,
    );
    return json({ cobro }, 201);
  } catch (error) {
    return respuestaDeError(error);
  }
}
