import { describe, expect, it } from "vitest";
import {
  accesoConfigurado,
  accesoRequerido,
  COOKIE_VENDEDOR,
  cookieSesion,
  crearSesion,
  exigirVendedor,
  leerCookie,
  pinCorrecto,
  SESION_VENDEDOR_S,
  sesionValida,
} from "./vendedor";

const env = {
  VENDEDOR_PIN: "clave-larga-123",
  CONFIRMACION_SECRETO: "s".repeat(32),
};
const T0 = Date.UTC(2026, 9, 17, 12);

const peticion = (cookie?: string) =>
  new Request("https://trivo.test/api/cobros", {
    headers: cookie ? { cookie } : {},
  });

describe("cuándo se exige la clave", () => {
  it("con el riel real siempre; en demo solo si hay clave", () => {
    expect(accesoRequerido({ COBROS_RAIL: "open-payments" })).toBe(true);
    expect(accesoRequerido({})).toBe(false);
    expect(accesoRequerido({ VENDEDOR_PIN: "x" })).toBe(true);
  });

  it("una clave corta o ausente no cuenta como configurada", () => {
    expect(accesoConfigurado({ VENDEDOR_PIN: "corta" })).toBe(false);
    expect(accesoConfigurado({})).toBe(false);
    expect(accesoConfigurado(env)).toBe(true);
  });
});

describe("clave y sesión", () => {
  it("acepta la clave correcta y rechaza cualquier otra", () => {
    expect(pinCorrecto("clave-larga-123", env)).toBe(true);
    expect(pinCorrecto("clave-larga-124", env)).toBe(false);
    expect(pinCorrecto("", env)).toBe(false);
  });

  it("sin clave configurada nada entra, ni siquiera una cadena vacía", () => {
    expect(pinCorrecto("", {})).toBe(false);
    expect(pinCorrecto("corta", { VENDEDOR_PIN: "corta" })).toBe(false);
  });

  it("la sesión vale hasta su vencimiento", () => {
    const token = crearSesion(env, T0);
    expect(sesionValida(token, env, T0 + 1_000)).toBe(true);
    expect(sesionValida(token, env, T0 + SESION_VENDEDOR_S * 1000 + 1)).toBe(
      false,
    );
  });

  it("una sesión alterada o de otra clave no vale", () => {
    const token = crearSesion(env, T0);
    const [vence, firma] = token.split(".");
    const masLarga = `${Number(vence) + 99_999}.${firma}`;
    expect(sesionValida(masLarga, env, T0)).toBe(false);
    expect(sesionValida(`${vence}.x${firma}`, env, T0)).toBe(false);
    expect(
      sesionValida(token, { ...env, VENDEDOR_PIN: "otra-clave-999" }, T0),
    ).toBe(false);
    for (const basura of [undefined, "", "abc", "1.2.3", "no.firma"])
      expect(sesionValida(basura, env, T0)).toBe(false);
  });
});

describe("exigirVendedor", () => {
  it("deja pasar sin clave en demo", () => {
    expect(exigirVendedor(peticion(), {}, T0)).toBeNull();
  });

  it("rechaza con 401 sin cookie o con una inválida", async () => {
    const sin = exigirVendedor(peticion(), env, T0);
    expect(sin?.status).toBe(401);
    expect(await sin?.json()).toEqual({ error: "no_autorizado" });
    expect(
      exigirVendedor(peticion(`${COOKIE_VENDEDOR}=falsa`), env, T0)?.status,
    ).toBe(401);
  });

  it("deja pasar con una sesión válida entre otras cookies", () => {
    const cookie = `otra=1; ${COOKIE_VENDEDOR}=${crearSesion(env, T0)}; mas=2`;
    expect(exigirVendedor(peticion(cookie), env, T0 + 1_000)).toBeNull();
  });

  it("con el riel real y sin clave configurada responde 503, no deja pasar", () => {
    const real = { COBROS_RAIL: "open-payments" };
    expect(exigirVendedor(peticion(), real, T0)?.status).toBe(503);
  });
});

describe("cookie", () => {
  it("es HttpOnly y SameSite; Secure solo con https", () => {
    const http = cookieSesion("t", { APP_BASE_URL: "http://1.2.3.4:9028" });
    expect(http).toContain("HttpOnly");
    expect(http).toContain("SameSite=Lax");
    expect(http).not.toContain("Secure");
    expect(cookieSesion("t", { APP_BASE_URL: "https://trivo.app" })).toContain(
      "; Secure",
    );
  });

  it("lee una cookie por nombre", () => {
    expect(leerCookie("a=1; b=2", "b")).toBe("2");
    expect(leerCookie("a=1", "b")).toBeUndefined();
    expect(leerCookie(null, "b")).toBeUndefined();
  });
});
