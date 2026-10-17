import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  certificadoSchema,
  certificadoValido,
  codigoCertificado,
  enlaceVerificacion,
  generarCertificadoPdf,
  type DatosCertificado,
} from "./certificado";

const SECRETO = "s".repeat(40);
const datos: DatosCertificado = {
  comercio: "Tienda Rosa",
  usuario: "rosa",
  periodo: "2026-10",
  total: 1_250_000,
  cobros: 37,
  emitido: "2026-10-17",
};

describe("código del certificado", () => {
  it("tiene la forma ABCD-EFGH-IJKL-MNOP y es estable", () => {
    const c = codigoCertificado(datos, SECRETO);
    expect(c).toMatch(/^([0-9A-F]{4}-){3}[0-9A-F]{4}$/);
    expect(codigoCertificado(datos, SECRETO)).toBe(c);
  });

  it("cambia si cambia cualquier dato o el secreto", () => {
    const base = codigoCertificado(datos, SECRETO);
    for (const cambio of [
      { comercio: "Otra tienda" },
      { usuario: "otro" },
      { periodo: "2026-09" },
      { total: 1_250_001 },
      { cobros: 38 },
      { emitido: "2026-10-18" },
    ])
      expect(codigoCertificado({ ...datos, ...cambio }, SECRETO)).not.toBe(
        base,
      );
    expect(codigoCertificado(datos, "t".repeat(40))).not.toBe(base);
  });
});

describe("verificación", () => {
  const codigo = codigoCertificado(datos, SECRETO);

  it("acepta el certificado intacto, sin importar mayúsculas ni espacios", () => {
    expect(certificadoValido(datos, codigo, SECRETO)).toBe(true);
    expect(certificadoValido(datos, ` ${codigo.toLowerCase()} `, SECRETO)).toBe(
      true,
    );
  });

  it("rechaza cifras alteradas, otro código o basura", () => {
    expect(
      certificadoValido({ ...datos, total: 9_999_999 }, codigo, SECRETO),
    ).toBe(false);
    expect(certificadoValido(datos, "0000-0000-0000-0000", SECRETO)).toBe(
      false,
    );
    expect(certificadoValido(datos, "", SECRETO)).toBe(false);
    expect(certificadoValido(datos, "x".repeat(500), SECRETO)).toBe(false);
  });

  it("el enlace lleva todo lo firmado y se lee de vuelta con el mismo resultado", () => {
    const url = new URL(
      enlaceVerificacion("https://trivo.test/", datos, codigo),
    );
    expect(url.pathname).toBe("/verificar");
    const p = certificadoSchema.parse(Object.fromEntries(url.searchParams));
    expect(
      certificadoValido(
        {
          comercio: p.n,
          usuario: p.u,
          periodo: p.p,
          total: p.t,
          cobros: p.k,
          emitido: p.e,
        },
        p.c,
        SECRETO,
      ),
    ).toBe(true);
  });

  it("un enlace con datos inválidos ni siquiera se interpreta", () => {
    expect(
      certificadoSchema.safeParse({
        n: "x",
        p: "2026-13",
        t: "1",
        k: "1",
        e: "2026-10-17",
        c: "x",
      }).success,
    ).toBe(false);
    expect(
      certificadoSchema.safeParse({
        n: "x",
        p: "2026-10",
        t: "-5",
        k: "1",
        e: "2026-10-17",
        c: "x",
      }).success,
    ).toBe(false);
  });
});

describe("PDF del certificado", () => {
  it("genera una página carta, también con caracteres que la fuente no escribe", async () => {
    const raro = { ...datos, comercio: "Café ☕ 李雷" };
    const codigo = codigoCertificado(raro, SECRETO);
    const bytes = await generarCertificadoPdf(
      raro,
      codigo,
      enlaceVerificacion("https://trivo.test", raro, codigo),
    );
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
});
