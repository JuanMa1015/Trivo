import { describe, expect, it } from "vitest";
import { accesoSchema, cobrosRestantes, registroSchema } from "./perfil";

const valido = {
  usuario: "doña.rosa",
  comercio: "Tienda Rosa",
  password: "clave-larga-1",
  wallet: "https://ilp.interledger-test.dev/rosa",
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
    ["sin wallet", { wallet: "" }],
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
      wallet: " https://ilp.interledger-test.dev/rosa ",
    });
    expect(r).toMatchObject({
      usuario: "rosa",
      wallet: "https://ilp.interledger-test.dev/rosa",
      comercio: "Tienda Rosa",
      password: " con espacios ",
    });
  });
});

describe("usuario", () => {
  it("se guarda en minúsculas, para que Rosa y rosa sean la misma cuenta", () => {
    expect(
      registroSchema.parse({ ...valido, usuario: "Doña.ROSA" }).usuario,
    ).toBe("doña.rosa");
  });
});

describe("accesoSchema", () => {
  it("pide usuario y contraseña", () => {
    expect(
      accesoSchema.safeParse({ usuario: "rosa", password: "x" }).success,
    ).toBe(true);
    expect(accesoSchema.safeParse({ usuario: "", password: "x" }).success).toBe(
      false,
    );
    expect(
      accesoSchema.safeParse({ usuario: "rosa", password: "" }).success,
    ).toBe(false);
  });
});

describe("cobrosRestantes", () => {
  it("cuenta hacia atrás sin pasar de cero", () => {
    expect(cobrosRestantes({ cobrosCreados: 2, limite: 5 })).toBe(3);
    expect(cobrosRestantes({ cobrosCreados: 9, limite: 5 })).toBe(0);
  });
});
