import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { Cobro } from "@/lib/cobros";
import { generarComprobante } from "./comprobante";

const cobro: Cobro = {
  id: "id-1",
  comercioId: "c-1",
  numero: 12,
  codigo: "657785",
  token: "t".repeat(22),
  comercio: "Almacén El Centro",
  monto: 30_000,
  concepto: "Ropa",
  estado: "cobrado",
  creadoEn: "2026-10-17T07:31:00.000Z",
  venceEn: "2026-10-17T07:41:00.000Z",
  pagadoEn: "2026-10-17T07:33:00.000Z",
  confirmacion: "0919",
  eventos: [
    {
      tipo: "cotizado",
      en: "2026-10-17T07:32:00.000Z",
      detalle: "JuanLondoño",
    },
  ],
};

describe("comprobante de pago", () => {
  it("genera un PDF carta de una página", async () => {
    const bytes = await generarComprobante(cobro, "a4");
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });

  it("genera un ticket POS de 80 mm de ancho", async () => {
    const doc = await PDFDocument.load(await generarComprobante(cobro, "pos"));
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(226);
  });

  it("no se rompe con nombres que la fuente del PDF no puede escribir", async () => {
    const raro: Cobro = {
      ...cobro,
      concepto:
        "Café ☕ para llevar con un nombre muy largo que tiene que partirse",
      eventos: [
        {
          tipo: "cotizado",
          en: "2026-10-17T07:32:00.000Z",
          detalle: "李雷 😀 Ñandú",
        },
      ],
    };
    for (const formato of ["a4", "pos"] as const) {
      const bytes = await generarComprobante(raro, formato);
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
  });

  it("sirve sin pagador ni código de confirmación", async () => {
    const minimo: Cobro = { ...cobro, eventos: [], confirmacion: undefined };
    const bytes = await generarComprobante(minimo, "pos");
    expect(bytes.length).toBeGreaterThan(500);
  });
});
