import { describe, expect, it } from "vitest";
import {
  aprobarSchema,
  costoConversion,
  cotizarSchema,
  crearCobroSchema,
  estaVencido,
  eventoClienteSchema,
  formatearCuentaRegresiva,
  montoANumero,
  segundosRestantes,
  tasaImplicita,
} from "./cobros";

const venceEn = "2026-10-16T12:10:00.000Z";
const antes = Date.parse("2026-10-16T12:00:00.000Z");
const despues = Date.parse("2026-10-16T12:10:00.000Z");

describe("vencimiento", () => {
  it("solo vence lo que está esperando", () => {
    expect(estaVencido({ estado: "esperando", venceEn }, antes)).toBe(false);
    expect(estaVencido({ estado: "esperando", venceEn }, despues)).toBe(true);
    expect(estaVencido({ estado: "procesando", venceEn }, despues)).toBe(false);
    expect(estaVencido({ estado: "cobrado", venceEn }, despues)).toBe(false);
  });

  it("cuenta los segundos que faltan sin bajar de cero", () => {
    expect(segundosRestantes(venceEn, antes)).toBe(600);
    expect(segundosRestantes(venceEn, despues + 5_000)).toBe(0);
  });

  it("formatea mm:ss", () => {
    expect(formatearCuentaRegresiva(600)).toBe("10:00");
    expect(formatearCuentaRegresiva(65)).toBe("01:05");
    expect(formatearCuentaRegresiva(0)).toBe("00:00");
  });
});

describe("validación de entradas", () => {
  it("acepta un cobro válido y limpia el concepto", () => {
    expect(crearCobroSchema.parse({ monto: 5000, concepto: " Ropa " })).toEqual(
      { monto: 5000, concepto: "Ropa" },
    );
    expect(crearCobroSchema.parse({ monto: 5000 }).concepto).toBe("");
  });

  it("rechaza montos inválidos", () => {
    for (const monto of [0, -1, 1.5, 1_000_000_000, "5000", null]) {
      expect(crearCobroSchema.safeParse({ monto }).success).toBe(false);
    }
  });

  it("solo deja registrar los eventos que vienen del cliente", () => {
    expect(
      eventoClienteSchema.safeParse({ tipo: "link_copiado" }).success,
    ).toBe(true);
    expect(eventoClienteSchema.safeParse({ tipo: "cobrado" }).success).toBe(
      false,
    );
  });

  it("exige una wallet https para cotizar", () => {
    const ok = "https://ilp.interledger-test.dev/mi-wallet";
    expect(cotizarSchema.safeParse({ wallet: ok }).success).toBe(true);
    expect(
      cotizarSchema.safeParse({ wallet: "$ilp.dev/mi-wallet" }).success,
    ).toBe(false);
    expect(cotizarSchema.safeParse({ wallet: "http://x.dev/a" }).success).toBe(
      false,
    );
  });

  it("aprobar exige el id del intento que se cotizó", () => {
    const id = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
    expect(aprobarSchema.safeParse({ intentoId: id }).success).toBe(true);
    expect(aprobarSchema.safeParse({ intentoId: "no-es-uuid" }).success).toBe(
      false,
    );
    expect(aprobarSchema.safeParse({ wallet: "https://x.dev/a" }).success).toBe(
      false,
    );
  });
});

describe("importes de Open Payments", () => {
  const cop = { valor: "5000000", codigo: "COP", escala: 2 };
  const usd = { valor: "1574", codigo: "USD", escala: 2 };

  it("convierte unidades menores a número", () => {
    expect(montoANumero(cop)).toBe(50_000);
    expect(montoANumero(usd)).toBe(15.74);
  });

  it("calcula la tasa solo si las monedas son distintas", () => {
    expect(tasaImplicita(usd, cop)).toBeCloseTo(3176.62, 1);
    expect(tasaImplicita(cop, cop)).toBeNull();
  });
});

describe("costoConversion", () => {
  const debito = { valor: "1000", codigo: "EUR", escala: 2 };
  const recibe = {
    valor: "3_000_000".replace(/_/g, ""),
    codigo: "COP",
    escala: 2,
  };

  it("es lo que se paga de más frente a la tasa de mercado", () => {
    // A 3.200 COP/EUR, 30.000 COP valen 9,375 EUR; pagar 10 EUR es 0,625 de más.
    const c = costoConversion(debito, recibe, 3_200);
    expect(c?.monto).toEqual({ valor: "63", codigo: "EUR", escala: 2 });
    expect(c?.porcentaje).toBeCloseTo(6.25, 2);
  });

  it("no hay costo sin referencia, sin conversión o si la wallet da mejor tasa", () => {
    expect(costoConversion(debito, recibe, null)).toBeNull();
    expect(
      costoConversion(debito, { ...recibe, codigo: "EUR" }, 3_200),
    ).toBeNull();
    expect(costoConversion(debito, recibe, 3_000)).toBeNull();
    expect(costoConversion(debito, recibe, 2_900)).toBeNull();
  });
});
