import { describe, expect, it } from "vitest";
import {
  aprobarSchema,
  crearCobroSchema,
  estaVencido,
  eventoClienteSchema,
  formatearCuentaRegresiva,
  segundosRestantes,
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

  it("exige una wallet https", () => {
    const ok = "https://ilp.interledger-test.dev/mi-wallet";
    expect(aprobarSchema.safeParse({ wallet: ok }).success).toBe(true);
    expect(
      aprobarSchema.safeParse({ wallet: "$ilp.dev/mi-wallet" }).success,
    ).toBe(false);
    expect(aprobarSchema.safeParse({ wallet: "http://x.dev/a" }).success).toBe(
      false,
    );
  });
});
