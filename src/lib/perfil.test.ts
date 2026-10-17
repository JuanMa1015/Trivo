import { describe, expect, it } from "vitest";
import { cobrosRestantes, mesDeInicio, registroSchema } from "./perfil";

const valido = {
  usuario: "doña.rosa",
  comercio: "Tienda Rosa",
  password: "clave-larga-1",
};

describe("registroSchema", () => {
  it("acepta datos válidos, con tildes en el usuario", () => {
    expect(registroSchema.safeParse(valido).success).toBe(true);
  });

  it.each([
    ["usuario muy corto", { usuario: "ab" }],
    ["usuario con espacios", { usuario: "mi usuario" }],
    ["usuario con símbolos", { usuario: "rosa@tienda" }],
    ["comercio muy corto", { comercio: "A" }],
    ["contraseña corta", { password: "corta" }],
    ["contraseña enorme", { password: "x".repeat(101) }],
  ])("rechaza %s", (_, cambio) => {
    expect(registroSchema.safeParse({ ...valido, ...cambio }).success).toBe(
      false,
    );
  });

  it("recorta espacios del usuario y del comercio, no de la contraseña", () => {
    const r = registroSchema.parse({
      usuario: "  rosa  ",
      comercio: "  Tienda Rosa ",
      password: " con espacios ",
    });
    expect(r).toMatchObject({
      usuario: "rosa",
      comercio: "Tienda Rosa",
      password: " con espacios ",
    });
  });
});

describe("cobrosRestantes", () => {
  it("cuenta hacia atrás sin pasar de cero", () => {
    expect(cobrosRestantes({ cobrosCreados: 2, limite: 5 })).toBe(3);
    expect(cobrosRestantes({ cobrosCreados: 9, limite: 5 })).toBe(0);
  });
});

describe("mesDeInicio", () => {
  it("es el mes en que empezó el comercio, en hora de Colombia", () => {
    expect(mesDeInicio({ creadoEn: "2026-10-05T15:00:00.000Z" })).toBe(
      "2026-10",
    );
    // 1 de octubre a las 02:00 UTC todavía es 30 de septiembre en Bogotá.
    expect(mesDeInicio({ creadoEn: "2026-10-01T02:00:00.000Z" })).toBe(
      "2026-09",
    );
  });
});
