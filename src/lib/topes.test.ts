import { describe, expect, it } from "vitest";
import { TOPES_UVT, calcularProgreso, limiteEnPesos, valorUvt } from "./topes";

const facturacion = TOPES_UVT.find((t) => t.id === "facturacion")!;
const renta = TOPES_UVT.find((t) => t.id === "renta-ingresos")!;

describe("limiteEnPesos", () => {
  it("convierte 3.500 UVT con la UVT 2026", () => {
    expect(limiteEnPesos(facturacion, 2026)).toBe(183_309_000);
  });

  it("usa la UVT de 2025 para renta del año gravable 2025", () => {
    expect(limiteEnPesos(renta, 2025)).toBe(69_718_600);
  });

  it("falla de forma explícita si el año no está configurado", () => {
    expect(() => valorUvt(2030)).toThrow(/2030/);
  });
});

describe("calcularProgreso", () => {
  const limite = 1_000;

  it.each([
    [0, "ok"],
    [699, "ok"],
    [700, "atencion"],
    [899, "atencion"],
    [900, "critico"],
    [999, "critico"],
    [1_000, "superado"],
    [1_500, "superado"],
  ] as const)("acumulado %i es %s", (acumulado, nivel) => {
    expect(calcularProgreso(acumulado, limite).nivel).toBe(nivel);
  });

  it("calcula lo que falta y no recorta el porcentaje", () => {
    expect(calcularProgreso(250, limite)).toEqual({
      porcentaje: 25,
      restante: 750,
      nivel: "ok",
    });
    expect(calcularProgreso(1_500, limite)).toMatchObject({
      porcentaje: 150,
      restante: 0,
    });
  });

  it("rechaza límites y acumulados inválidos", () => {
    expect(() => calcularProgreso(1, 0)).toThrow();
    expect(() => calcularProgreso(-1, limite)).toThrow();
    expect(() => calcularProgreso(Number.NaN, limite)).toThrow();
  });
});
