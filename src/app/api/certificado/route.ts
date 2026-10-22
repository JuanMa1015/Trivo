import { connection } from "next/server";
import { hoyEnColombia, limitesDelMes } from "@/lib/impuestos";
import { mesDeInicio } from "@/lib/perfil";
import {
  PERIODO_RE,
  codigoCertificado,
  enlaceVerificacion,
  generarCertificadoPdf,
  type DatosCertificado,
} from "@/server/certificado";
import { secretoConfirmacion } from "@/server/confirmacion";
import { json, respuestaDeError } from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { sinSesion, vendedorDe } from "@/server/vendedor";

/**
 * Certificado de ventas de un mes (`?mes=YYYY-MM`, por defecto el actual) en PDF, con un
 * código y un QR para que quien lo reciba compruebe en /verificar que no fue alterado.
 */
export async function GET(request: Request) {
  await connection();
  const vendedor = await vendedorDe(request);
  if (!vendedor) return sinSesion();
  // El certificado lleva el usuario y se puede verificar: solo para comercios con cuenta.
  if (!vendedor.perfil.registrado)
    return json({ error: "registro_requerido" }, 403);

  const hoy = hoyEnColombia(Date.now());
  const pedido =
    new URL(request.url).searchParams.get("mes") ?? hoy.slice(0, 7);
  // No se certifican meses que aún no empiezan.
  if (!PERIODO_RE.test(pedido) || pedido > hoy.slice(0, 7))
    return json({ error: "datos_invalidos" }, 400);

  try {
    const servicio = obtenerServicio();
    const { perfil } = vendedor;
    // Ni meses de antes de que el comercio empezara en Trivo: no hay nada que certificar.
    if (pedido < mesDeInicio(perfil))
      return json({ error: "datos_invalidos" }, 400);
    const { desde, hasta } = limitesDelMes(pedido);
    const { total, cobros } = await servicio.resumenCobrado(
      vendedor.comercioId,
      desde,
      hasta,
    );
    const datos: DatosCertificado = {
      comercio: perfil.comercio,
      ...(perfil.usuario ? { usuario: perfil.usuario } : {}),
      periodo: pedido,
      total,
      cobros,
      emitido: hoy,
    };
    const codigo = codigoCertificado(datos, secretoConfirmacion());
    const base = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    const pdf = await generarCertificadoPdf(
      datos,
      codigo,
      enlaceVerificacion(base, datos, codigo),
    );
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificado-ventas-${pedido}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}
