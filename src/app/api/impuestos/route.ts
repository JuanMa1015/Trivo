import { connection } from "next/server";
import { z } from "zod";
import { json, respuestaDeError } from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

const anioSchema = z.coerce.number().int().min(2025).max(2100);

/** Lo cobrado con Trivo en un año (por defecto, el actual): base del avance hacia los topes. */
export async function GET(request: Request) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  const pedido = new URL(request.url).searchParams.get("anio");
  const anio = anioSchema.safeParse(
    pedido ??
      new Date()
        .toLocaleDateString("en-CA", {
          timeZone: "America/Bogota",
        })
        .slice(0, 4),
  );
  if (!anio.success) return json({ error: "datos_invalidos" }, 400);
  try {
    const ingresos = await obtenerServicio().ingresosDelAnio(anio.data);
    return json({ anio: anio.data, ingresos });
  } catch (error) {
    return respuestaDeError(error);
  }
}
