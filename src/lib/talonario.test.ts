import { describe, expect, it } from "vitest";
import { aplicarTecla, codigoAgrupado, totalCobrado } from "./talonario";

describe("talonario", () => {
  it("suma solo lo cobrado", () => {
    expect(
      totalCobrado([
        { estado: "cobrado", monto: 35_000 },
        { estado: "cobrado", monto: 120_000 },
        { estado: "vencido", monto: 18_000 },
        { estado: "procesando", monto: 9_000 },
      ]),
    ).toBe(155_000);
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
