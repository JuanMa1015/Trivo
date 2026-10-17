import { createHmac, timingSafeEqual } from "node:crypto";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { nombreDelPeriodo } from "@/lib/impuestos";

/**
 * Certificado de ventas de un mes: resume lo cobrado con Trivo y lleva un código que firma
 * sus datos con un secreto del servidor. Cualquiera puede comprobarlo en /verificar sin
 * iniciar sesión: la firma cubre comercio, periodo, total, cantidad y fecha, así que
 * cambiar una cifra del PDF o del enlace lo invalida. No es un certificado contable.
 */
export { nombreDelPeriodo as nombreDelMes };

export type DatosCertificado = {
  comercio: string;
  usuario?: string;
  /** Mes certificado, `YYYY-MM`. */
  periodo: string;
  total: number;
  cobros: number;
  /** Día de emisión, `YYYY-MM-DD` (hora de Colombia). */
  emitido: string;
};

export const PERIODO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Los parámetros del enlace de verificación, validados al leerlos. */
export const certificadoSchema = z.object({
  n: z.string().trim().min(1).max(60),
  u: z.string().trim().max(30).optional(),
  p: z.string().regex(PERIODO_RE),
  t: z.coerce.number().int().min(0).max(1e13),
  k: z.coerce.number().int().min(0).max(1e9),
  e: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  c: z.string().max(40),
});

function firmar(d: DatosCertificado, secreto: string): string {
  return createHmac("sha256", secreto)
    .update(
      [
        "trivo-certificado-v1",
        d.comercio,
        d.usuario ?? "",
        d.periodo,
        d.total,
        d.cobros,
        d.emitido,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

/** Código legible para dictar o teclear: `ABCD-EFGH-IJKL-MNOP`. */
export function codigoCertificado(
  d: DatosCertificado,
  secreto: string,
): string {
  return firmar(d, secreto).match(/.{4}/g)!.join("-");
}

export function certificadoValido(
  d: DatosCertificado,
  codigo: string,
  secreto: string,
): boolean {
  const esperado = Buffer.from(codigoCertificado(d, secreto));
  const recibido = Buffer.from(codigo.trim().toUpperCase());
  return (
    esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
  );
}

/** Enlace público de verificación, con los datos firmados y el código. */
export function enlaceVerificacion(
  base: string,
  d: DatosCertificado,
  codigo: string,
): string {
  const q = new URLSearchParams({
    n: d.comercio,
    ...(d.usuario ? { u: d.usuario } : {}),
    p: d.periodo,
    t: String(d.total),
    k: String(d.cobros),
    e: d.emitido,
    c: codigo,
  });
  return `${base.replace(/\/+$/, "")}/verificar?${q}`;
}

/** Las fuentes estándar del PDF solo entienden Latin-1: lo demás se cambia por "?". */
const seguro = (t: string) =>
  t.replace(/[  ]/g, " ").replace(/[^\x20-\x7e\xa1-\xff]/g, "?");

export async function generarCertificadoPdf(
  d: DatosCertificado,
  codigo: string,
  enlace: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pagina = pdf.addPage([595, 842]);
  const PRIMARIO = rgb(0, 0.494, 0.655);
  const TINTA = rgb(0.12, 0.12, 0.12);
  const GRIS = rgb(0.4, 0.4, 0.4);
  const margen = 56;
  const ancho = 595 - margen * 2;

  const texto = (
    t: string,
    x: number,
    y: number,
    tam: number,
    fuente = normal,
    color = TINTA,
  ) => pagina.drawText(seguro(t), { x, y, size: tam, font: fuente, color });

  texto("Trivo", margen, 770, 28, negrita, PRIMARIO);
  texto("Certificado de ventas", margen, 735, 16);
  pagina.drawLine({
    start: { x: margen, y: 715 },
    end: { x: 595 - margen, y: 715 },
    thickness: 0.8,
    color: GRIS,
  });

  const filas: [string, string, boolean?][] = [
    ["Comercio", d.comercio],
    ...(d.usuario ? ([["Titular", d.usuario]] as [string, string][]) : []),
    ["Periodo", nombreDelPeriodo(d.periodo)],
    ["Cobros recibidos", String(d.cobros)],
    ["Total cobrado", `$ ${d.total.toLocaleString("es-CO")} COP`, true],
    ["Fecha de emisión", d.emitido],
  ];
  let y = 680;
  for (const [etiqueta, valor, destacado] of filas) {
    texto(etiqueta, margen, y, 11, normal, GRIS);
    texto(
      valor,
      margen,
      y - 20,
      destacado ? 22 : 14,
      destacado ? negrita : normal,
      destacado ? PRIMARIO : TINTA,
    );
    y -= destacado ? 62 : 52;
  }

  // Verificación: código para teclear y QR con el enlace.
  y -= 10;
  pagina.drawLine({
    start: { x: margen, y },
    end: { x: 595 - margen, y },
    thickness: 0.8,
    color: GRIS,
  });
  texto("Verifica este certificado", margen, y - 28, 13, negrita);
  texto("Código", margen, y - 52, 11, normal, GRIS);
  texto(codigo, margen, y - 74, 18, negrita, PRIMARIO);
  texto("Escanea el QR o abre este enlace:", margen, y - 100, 10, normal, GRIS);
  const url = seguro(enlace);
  const cortes = url.match(/.{1,90}/g) ?? [url];
  cortes
    .slice(0, 4)
    .forEach((linea, i) =>
      texto(linea, margen, y - 114 - i * 11, 7.5, normal, GRIS),
    );
  const png = await pdf.embedPng(
    await QRCode.toBuffer(enlace, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
    }),
  );
  pagina.drawImage(png, {
    x: 595 - margen - 120,
    y: y - 130,
    width: 120,
    height: 120,
  });

  const aviso =
    "Resumen de los cobros recibidos con Trivo en el periodo, según los registros de Trivo. Comprueba que no fue alterado con el código o el QR. No es un certificado contable ni sustituye tus declaraciones ante la DIAN.";
  const palabras = seguro(aviso).split(" ");
  let linea = "";
  let yy = 90;
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (normal.widthOfTextAtSize(prueba, 9) > ancho) {
      texto(linea, margen, yy, 9, normal, GRIS);
      yy -= 12;
      linea = p;
    } else linea = prueba;
  }
  texto(linea, margen, yy, 9, normal, GRIS);

  return pdf.save();
}
