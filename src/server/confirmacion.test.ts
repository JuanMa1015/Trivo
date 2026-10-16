import { describe, expect, it } from "vitest";
import { TOKEN_RE } from "@/lib/cobros";
import {
  codigoConfirmacion,
  nuevoCodigo,
  nuevoToken,
  secretoConfirmacion,
} from "./confirmacion";

describe("tokens y códigos", () => {
  it("el token tiene 128 bits en base64url y no se repite", () => {
    const tokens = new Set(Array.from({ length: 2_000 }, nuevoToken));
    expect(tokens.size).toBe(2_000);
    for (const t of tokens) expect(t).toMatch(TOKEN_RE);
  });

  it("el código de voz siempre tiene 6 dígitos", () => {
    for (let i = 0; i < 500; i++) expect(nuevoCodigo()).toMatch(/^\d{6}$/);
  });
});

describe("codigoConfirmacion", () => {
  const secreto = "a".repeat(32);
  const cobro = {
    id: "id-1",
    monto: 50_000,
    pagadoEn: "2026-10-16T15:00:07.000Z",
  };

  it("son 4 dígitos y es el mismo para los mismos datos", () => {
    expect(codigoConfirmacion(secreto, cobro)).toMatch(/^\d{4}$/);
    expect(codigoConfirmacion(secreto, cobro)).toBe(
      codigoConfirmacion(secreto, cobro),
    );
  });

  it("sin el secreto no se puede producir: otro secreto da otro código", () => {
    expect(codigoConfirmacion("b".repeat(32), cobro)).not.toBe(
      codigoConfirmacion(secreto, cobro),
    );
  });

  it("depende del cobro, del monto y del momento del pago", () => {
    const base = codigoConfirmacion(secreto, cobro);
    expect(codigoConfirmacion(secreto, { ...cobro, id: "id-2" })).not.toBe(
      base,
    );
    expect(codigoConfirmacion(secreto, { ...cobro, monto: 50_001 })).not.toBe(
      base,
    );
    expect(
      codigoConfirmacion(secreto, {
        ...cobro,
        pagadoEn: "2026-10-16T15:00:08.000Z",
      }),
    ).not.toBe(base);
  });
});

describe("secretoConfirmacion", () => {
  it("usa el configurado si tiene al menos 32 caracteres", () => {
    expect(secretoConfirmacion({ CONFIRMACION_SECRETO: "x".repeat(40) })).toBe(
      "x".repeat(40),
    );
  });

  it("rechaza uno corto", () => {
    expect(() =>
      secretoConfirmacion({ CONFIRMACION_SECRETO: "corto" }),
    ).toThrow(/32/);
  });

  it("en producción con Open Payments real es obligatorio", () => {
    expect(() =>
      secretoConfirmacion({
        NODE_ENV: "production",
        COBROS_RAIL: "open-payments",
      }),
    ).toThrow(/CONFIRMACION_SECRETO/);
  });

  it("en demo y desarrollo usa uno aleatorio, estable durante el proceso", () => {
    const a = secretoConfirmacion({});
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(secretoConfirmacion({})).toBe(a);
  });
});
