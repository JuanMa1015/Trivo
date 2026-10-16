import { describe, expect, it } from "vitest";
import {
  RECIBOS_EJEMPLO,
  aplicarTecla,
  codigoAgrupado,
  generarCodigo,
  siguienteNumero,
  totalCobrado,
} from "./talonario";

describe("talonario", () => {
  it("numera el siguiente recibo", () => {
    expect(siguienteNumero([])).toBe(1);
    expect(siguienteNumero(RECIBOS_EJEMPLO)).toBe(43);
  });

  it("suma solo lo cobrado", () => {
    expect(totalCobrado(RECIBOS_EJEMPLO)).toBe(155_000);
  });

  it("genera códigos de 6 dígitos", () => {
    for (let i = 0; i < 50; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });

  it("agrupa el código en dos bloques", () => {
    expect(codigoAgrupado("482913")).toBe("482 913");
  });
});

describe("aplicarTecla", () => {
  it("construye el monto y quita ceros a la izquierda", () => {
    expect(aplicarTecla("", "0")).toBe("");
    expect(aplicarTecla("", "5")).toBe("5");
    expect(aplicarTecla("5", "00")).toBe("500");
  });

  it("borra el último dígito", () => {
    expect(aplicarTecla("1250", "borrar")).toBe("125");
    expect(aplicarTecla("", "borrar")).toBe("");
  });

  it("no pasa de 9 dígitos", () => {
    expect(aplicarTecla("123456789", "1")).toBe("123456789");
  });
});
