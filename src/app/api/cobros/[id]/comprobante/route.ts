import { connection } from "next/server";
import { generarComprobante } from "@/server/comprobante";
import {
  json,
  noEncontrado,
  respuestaDeError,
  uuidDeRuta,
} from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { vendedorDe } from "@/server/vendedor";

/**
 * Comprobante en PDF de un cobro ya cobrado: `?formato=a4` (carta, por defecto) o
 * `?formato=pos` (ticket de 80 mm). Solo el vendedor; no es una factura electrónica.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const id = uuidDeRuta((await ctx.params).id);
  if (id === null) return noEncontrado();
  const formato =
    new URL(request.url).searchParams.get("formato") === "pos" ? "pos" : "a4";
  try {
    const vendedor = await vendedorDe(request);
    if (!vendedor) return noEncontrado();
    const { comercioId } = vendedor;
    const servicio = obtenerServicio();
    const numero = await servicio.numeroDe(comercioId, id);
    const cobro =
      numero === undefined
        ? undefined
        : await servicio.obtener(comercioId, numero);
    if (!cobro) return noEncontrado();
    if (cobro.estado !== "cobrado")
      return json({ error: "no_disponible", estado: cobro.estado }, 409);

    const pdf = await generarComprobante(cobro, formato);
    const nombre = `comprobante-${String(cobro.numero).padStart(4, "0")}${formato === "pos" ? "-pos" : ""}.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}
