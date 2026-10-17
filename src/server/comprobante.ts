import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { pagadorDe, type Cobro } from "@/lib/cobros";

/**
 * Comprobante de pago de un cobro ya cobrado, en dos formatos: carta (A4) y ticket de
 * impresora POS de 80 mm. Es un recibo de Trivo, NO una factura electrónica de venta: esa la
 * emite el comercio ante la DIAN con su propio proveedor.
 */
export type FormatoComprobante = "a4" | "pos";

const AVISO =
  "Comprobante de pago de Trivo. No es una factura electrónica de venta ante la DIAN.";
const PRIMARIO = rgb(0, 0.494, 0.655);
const TINTA = rgb(0.12, 0.12, 0.12);
const GRIS = rgb(0.4, 0.4, 0.4);

/** Las fuentes estándar del PDF solo entienden Latin-1: lo demás (emojis, etc.) se cambia por "?". */
function seguro(texto: string): string {
  return texto.replace(/[  ]/g, " ").replace(/[^\x20-\x7e\xa1-\xff]/g, "?");
}

function fechaDe(iso: string): string {
  return seguro(
    new Date(iso).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "medium",
      timeStyle: "short",
    }),
  );
}

function filasDe(cobro: Cobro): [string, string][] {
  const filas: [string, string][] = [
    ["Comercio", cobro.comercio],
    ["Cobro N.º", String(cobro.numero).padStart(4, "0")],
    ["Fecha del pago", fechaDe(cobro.pagadoEn ?? cobro.creadoEn)],
    ["Concepto", cobro.concepto || "Sin concepto"],
  ];
  const pagador = pagadorDe(cobro);
  if (pagador) filas.push(["Pagó", pagador]);
  filas.push(
    ["Valor", `$ ${cobro.monto.toLocaleString("es-CO")} COP`],
    ["Estado", "Pagado"],
  );
  if (cobro.confirmacion)
    filas.push(["Código de confirmación", cobro.confirmacion]);
  return filas.map(([k, v]) => [seguro(k), seguro(v)]);
}

/** Parte un texto en líneas que quepan en `ancho` puntos. */
function envolver(
  texto: string,
  fuente: PDFFont,
  tamano: number,
  ancho: number,
): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && fuente.widthOfTextAtSize(prueba, tamano) > ancho) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  return actual ? [...lineas, actual] : lineas;
}

export async function generarComprobante(
  cobro: Cobro,
  formato: FormatoComprobante,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pos = formato === "pos";

  // POS: 80 mm de ancho (226 pt), alto según el contenido. A4: carta con márgenes.
  const ancho = pos ? 226 : 595;
  const margen = pos ? 14 : 56;
  const util = ancho - margen * 2;
  const tam = pos ? 9 : 12;
  const filas = filasDe(cobro);
  const aviso = envolver(seguro(AVISO), normal, tam - 1, util);

  const altoFila = pos ? 24 : 34;
  const alto = pos
    ? 90 + filas.length * altoFila + aviso.length * 11 + 40
    : 842;
  const pagina = pdf.addPage([ancho, alto]);

  let y = alto - margen;
  pagina.drawText("Trivo", {
    x: margen,
    y: y - (pos ? 14 : 24),
    size: pos ? 16 : 28,
    font: negrita,
    color: PRIMARIO,
  });
  y -= pos ? 26 : 44;
  pagina.drawText("Comprobante de pago", {
    x: margen,
    y: y - tam,
    size: pos ? 10 : 15,
    font: normal,
    color: TINTA,
  });
  y -= pos ? 22 : 40;
  pagina.drawLine({
    start: { x: margen, y },
    end: { x: ancho - margen, y },
    thickness: 0.8,
    color: GRIS,
    dashArray: pos ? [3, 3] : undefined,
  });
  y -= pos ? 8 : 20;

  for (const [etiqueta, valor] of filas) {
    const destacado = etiqueta === "Valor";
    pagina.drawText(etiqueta, {
      x: margen,
      y: y - tam,
      size: tam - 1,
      font: normal,
      color: GRIS,
    });
    const tamValor = destacado ? tam + (pos ? 3 : 6) : tam;
    const lineas = envolver(
      valor,
      destacado ? negrita : normal,
      tamValor,
      util,
    );
    lineas.forEach((linea, i) =>
      pagina.drawText(linea, {
        x: margen,
        y:
          y -
          tam -
          (destacado ? tamValor * 0.5 + 8 : pos ? 11 : 15) -
          i * (tamValor + 2),
        size: tamValor,
        font: destacado || etiqueta.startsWith("Código") ? negrita : normal,
        color: destacado ? PRIMARIO : TINTA,
      }),
    );
    y -= altoFila + (destacado ? 8 : 0) + (lineas.length - 1) * (tamValor + 2);
  }

  y -= pos ? 6 : 14;
  aviso.forEach((linea, i) =>
    pagina.drawText(linea, {
      x: margen,
      y: y - i * (tam + 2),
      size: tam - 1,
      font: normal,
      color: GRIS,
    }),
  );

  return pdf.save();
}
