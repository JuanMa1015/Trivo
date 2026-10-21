import { describe, expect, it } from "vitest";
import {
  COOKIE_VENDEDOR,
  comercioDe,
  comercioDeSesion,
  cookieSesion,
  crearSesion,
  leerCookie,
  SESION_VENDEDOR_S,
} from "./vendedor";

const env = { CONFIRMACION_SECRETO: "s".repeat(32) };
const T0 = Date.UTC(2026, 9, 17, 12);
const ROSA = "2f9c1d8e-5b7a-4c3e-9a10-6d4e8f0b1a23";
const LUIS = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

const peticion = (cookie?: string) =>
  new Request("https://trivo.test/api/cobros", {
    headers: cookie ? { cookie } : {},
  });

describe("sesión ligada al comercio", () => {
  it("la cookie lleva el comercio y vuelve a salir de ella", () => {
    const token = crearSesion(ROSA, env, T0);
    expect(comercioDeSesion(token, env, T0)).toBe(ROSA);
    expect(comercioDe(peticion(`${COOKIE_VENDEDOR}=${token}`), env, T0)).toBe(
      ROSA,
    );
  });

  it("no sirve cambiar el comercio de una cookie ajena", () => {
    const token = crearSesion(ROSA, env, T0);
    const [, vence, firma] = token.split(".");
    expect(comercioDeSesion(`${LUIS}.${vence}.${firma}`, env, T0)).toBe(
      undefined,
    );
  });

  it("vence a los 30 días", () => {
    const token = crearSesion(ROSA, env, T0);
    const casi = T0 + (SESION_VENDEDOR_S - 1) * 1000;
    expect(comercioDeSesion(token, env, casi)).toBe(ROSA);
    expect(comercioDeSesion(token, env, T0 + SESION_VENDEDOR_S * 1000)).toBe(
      undefined,
    );
  });

  it("firmada con otro secreto no vale (cambiar el secreto cierra las sesiones)", () => {
    const token = crearSesion(ROSA, env, T0);
    const otro = { CONFIRMACION_SECRETO: "x".repeat(32) };
    expect(comercioDeSesion(token, otro, T0)).toBe(undefined);
  });

  it("rechaza cookies vacías, mal formadas o con un id que no es UUID", () => {
    for (const malo of [
      undefined,
      "",
      "basura",
      "a.b",
      "a.b.c",
      `${ROSA}.abc.firma`,
      `no-es-uuid.${Math.floor(T0 / 1000) + 10}.firma`,
    ]) {
      expect(comercioDeSesion(malo, env, T0)).toBe(undefined);
    }
  });

  it("sin cookie no hay comercio", () => {
    expect(comercioDe(peticion(), env, T0)).toBe(undefined);
  });
});

describe("cookie", () => {
  it("lee la cookie correcta entre varias", () => {
    expect(leerCookie("a=1; trivo_vendedor=xyz; b=2", COOKIE_VENDEDOR)).toBe(
      "xyz",
    );
    expect(leerCookie(null, COOKIE_VENDEDOR)).toBeUndefined();
  });

  it("es HttpOnly y SameSite=Lax; Secure solo con https", () => {
    const http = cookieSesion("t", { APP_BASE_URL: "http://localhost:9028" });
    expect(http).toContain("HttpOnly");
    expect(http).toContain("SameSite=Lax");
    expect(http).not.toContain("Secure");
    expect(cookieSesion("t", { APP_BASE_URL: "https://trivo.test" })).toContain(
      "Secure",
    );
    expect(cookieSesion("", env, 0)).toContain("Max-Age=0");
  });
});
