import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROCESO_DEMO_MS, VENCE_EN_MS } from "@/lib/cobros";
import { crearRepoMemoria } from "./cobros-repo-memoria";
import { crearLimitador } from "./rate-limit";

const T0 = Date.parse("2026-10-16T15:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("cobros", () => {
  it("crea un cobro esperando, con vencimiento a 10 minutos y primer evento", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(50_000, "Ropa");
    expect(c.estado).toBe("esperando");
    expect(c.codigo).toMatch(/^\d{6}$/);
    expect(Date.parse(c.venceEn) - Date.parse(c.creadoEn)).toBe(VENCE_EN_MS);
    expect(c.eventos.map((e) => e.tipo)).toEqual(["creado"]);
  });

  it("numera seguido y no repite códigos", async () => {
    const repo = crearRepoMemoria();
    const a = await repo.crear(1_000, "");
    const b = await repo.crear(2_000, "");
    expect(b.numero).toBe(a.numero + 1);
    expect(b.codigo).not.toBe(a.codigo);
  });

  it("guarda la URL del incoming payment cuando se la dan", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(1_000, "", {
      incomingPaymentUrl: "https://op.dev/ip/1",
    });
    expect((await repo.obtener(c.numero))?.incomingPaymentUrl).toBe(
      "https://op.dev/ip/1",
    );
  });

  it("el talonario no trae eventos y va del más nuevo al más viejo", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(1_000, "");
    const lista = await repo.listar();
    expect(lista[0].numero).toBe(c.numero);
    expect("eventos" in lista[0]).toBe(false);
  });

  it("sin semilla arranca vacío", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    expect(await repo.listar()).toEqual([]);
  });

  it("vence al leer y deja constancia con la hora de vencimiento", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(50_000, "");
    vi.setSystemTime(T0 + VENCE_EN_MS + 1_000);
    expect((await repo.obtener(c.numero))?.estado).toBe("vencido");
    const vencidos = (await repo.obtener(c.numero))?.eventos.filter(
      (e) => e.tipo === "vencido",
    );
    expect(vencidos).toHaveLength(1);
    expect(vencidos?.[0].en).toBe(c.venceEn);
  });

  it("no deja pagar un cobro vencido", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(50_000, "");
    vi.setSystemTime(T0 + VENCE_EN_MS + 1_000);
    expect(await repo.iniciarPagoDemo(c.numero, "demo")).toEqual({
      ok: false,
      motivo: "no_disponible",
      estado: "vencido",
    });
  });
});

describe("pago de demo", () => {
  it("pasa por procesando y termina cobrado a los 5 segundos, con trazabilidad", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(50_000, "Ropa");
    await repo.registrarApertura(c.token);
    await repo.registrarApertura(c.token);

    expect(await repo.iniciarPagoDemo(c.numero, "https://ilp.dev/w")).toEqual({
      ok: true,
      estado: "procesando",
    });
    expect((await repo.obtener(c.numero))?.estado).toBe("procesando");

    vi.setSystemTime(T0 + PROCESO_DEMO_MS);
    const final = await repo.obtener(c.numero);
    expect(final?.estado).toBe("cobrado");
    expect(final?.pagadoEn).toBe(new Date(T0 + PROCESO_DEMO_MS).toISOString());
    expect(final?.eventos.map((e) => e.tipo)).toEqual([
      "creado",
      "abierto_por_pagador",
      "aprobacion_iniciada",
      "cobrado",
    ]);
  });

  it("con completarDemo apagado no se confirma solo", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    const c = await repo.crear(50_000, "");
    await repo.iniciarPagoDemo(c.numero, "demo");
    vi.setSystemTime(T0 + PROCESO_DEMO_MS * 10);
    expect((await repo.obtener(c.numero))?.estado).toBe("procesando");
  });

  it("no cobra dos veces", async () => {
    const repo = crearRepoMemoria();
    const c = await repo.crear(50_000, "");
    expect((await repo.iniciarPagoDemo(c.numero, "demo")).ok).toBe(true);
    expect(await repo.iniciarPagoDemo(c.numero, "demo")).toMatchObject({
      ok: false,
      motivo: "no_disponible",
    });
  });
});

describe("pago real: transiciones", () => {
  it("esperando -> procesando -> cobrado, cada paso con su evento", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    const c = await repo.crear(50_000, "");
    expect(await repo.marcarProcesando(c.numero, "https://op.dev/out/1")).toBe(
      true,
    );
    expect((await repo.listarProcesando()).map((x) => x.numero)).toEqual([
      c.numero,
    ]);
    expect(await repo.marcarCobrado(c.numero, "confirmado")).toBe(true);

    const final = await repo.obtener(c.numero);
    expect(final?.estado).toBe("cobrado");
    expect(final?.outgoingPaymentUrl).toBe("https://op.dev/out/1");
    expect(final?.eventos.map((e) => e.tipo)).toEqual([
      "creado",
      "pago_enviado",
      "cobrado",
    ]);
  });

  it("no repite transiciones ni salta estados", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    const c = await repo.crear(50_000, "");
    expect(await repo.marcarFallido(c.numero, "x")).toBe(false); // solo desde procesando
    expect(await repo.marcarProcesando(c.numero, "https://op.dev/out/1")).toBe(
      true,
    );
    expect(await repo.marcarProcesando(c.numero, "https://op.dev/out/2")).toBe(
      false,
    );
    expect(await repo.marcarCobrado(c.numero, "ok")).toBe(true);
    expect(await repo.marcarCobrado(c.numero, "otra vez")).toBe(false);
  });

  it("un pago que no llega queda fallido y deja constancia", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    const c = await repo.crear(50_000, "");
    await repo.marcarProcesando(c.numero, "https://op.dev/out/1");
    expect(await repo.marcarFallido(c.numero, "sin llegada")).toBe(true);
    const final = await repo.obtener(c.numero);
    expect(final?.estado).toBe("fallido");
    expect(final?.eventos.at(-1)).toMatchObject({
      tipo: "pago_fallido",
      detalle: "sin llegada",
    });
  });

  it("busca por id y por código", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: false,
      semilla: false,
    });
    const c = await repo.crear(50_000, "");
    expect((await repo.obtenerPorId(c.id))?.numero).toBe(c.numero);
    expect((await repo.obtenerPorCodigo(c.codigo))?.numero).toBe(c.numero);
    expect(await repo.obtenerPorCodigo("000000x")).toBeUndefined();
  });
});

describe("limitador", () => {
  it("corta al pasar el máximo y se reinicia con la ventana", () => {
    const permitir = crearLimitador(3, 60_000);
    expect([1, 2, 3, 4].map(() => permitir("ip", T0))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(permitir("otra", T0)).toBe(true);
    expect(permitir("ip", T0 + 60_000)).toBe(true);
  });
});

describe("totalCobradoDelAnio", () => {
  it("suma solo lo cobrado dentro del año, en hora de Colombia", async () => {
    let t = Date.UTC(2026, 11, 31, 14); // 31 dic 2026, 09:00 en Bogotá
    const repo = crearRepoMemoria(() => t, {
      completarDemo: false,
      semilla: false,
    });
    const a = await repo.crear(10_000, "");
    await repo.crear(7_000, ""); // sigue esperando: no cuenta
    await repo.marcarCobrado(a.numero, "x");

    t = Date.UTC(2027, 0, 1, 4, 30); // todavía 31 dic en Bogotá (23:30)
    const b = await repo.crear(5_000, "");
    await repo.marcarCobrado(b.numero, "x");

    expect(await repo.totalCobradoDelAnio(2026)).toBe(15_000);
    expect(await repo.totalCobradoDelAnio(2027)).toBe(0);
  });
});

describe("cuenta del comercio", () => {
  const sinSemilla = { completarDemo: false, semilla: false };

  it("sabe desde cuándo existe el comercio (incluye los cobros de ejemplo)", async () => {
    const t = Date.parse("2026-10-17T15:00:00.000Z");
    const vacio = crearRepoMemoria(() => t, sinSemilla);
    expect((await vacio.perfil()).creadoEn).toBe(new Date(t).toISOString());
    const conSemilla = crearRepoMemoria(() => t, {
      completarDemo: false,
      semilla: true,
    });
    const desde = Date.parse((await conSemilla.perfil()).creadoEn);
    const cobros = await conSemilla.listar();
    expect(desde).toBe(Math.min(...cobros.map((c) => Date.parse(c.creadoEn))));
  });

  it("al principio no hay cuenta y los cobros de ejemplo no cuentan", async () => {
    const repo = crearRepoMemoria(Date.now, {
      completarDemo: true,
      semilla: true,
    });
    expect(await repo.perfil()).toMatchObject({
      registrado: false,
      cobrosCreados: 0,
      limite: 5,
    });
    await repo.crear(1_000, "");
    expect((await repo.perfil()).cobrosCreados).toBe(1);
  });

  it("registrar guarda usuario y comercio, y renombra los cobros ya creados", async () => {
    const repo = crearRepoMemoria(Date.now, sinSemilla);
    const antes = await repo.crear(1_000, "");
    expect(
      await repo.registrarPerfil({
        usuario: "rosa",
        comercio: "Tienda Rosa",
        passwordHash: "scrypt$a$b",
      }),
    ).toBe(true);
    expect(await repo.perfil()).toMatchObject({
      registrado: true,
      usuario: "rosa",
      comercio: "Tienda Rosa",
    });
    expect((await repo.obtener(antes.numero))?.comercio).toBe("Tienda Rosa");
    expect((await repo.crear(2_000, "")).comercio).toBe("Tienda Rosa");
  });

  it("no se pisa una cuenta ya registrada", async () => {
    const repo = crearRepoMemoria(Date.now, sinSemilla);
    await repo.registrarPerfil({
      usuario: "rosa",
      comercio: "Uno",
      passwordHash: "scrypt$a$b",
    });
    expect(
      await repo.registrarPerfil({
        usuario: "otro",
        comercio: "Dos",
        passwordHash: "scrypt$c$d",
      }),
    ).toBe(false);
    expect(await repo.perfil()).toMatchObject({
      usuario: "rosa",
      comercio: "Uno",
    });
  });
});

describe("resumenCobrado", () => {
  it("suma y cuenta solo lo cobrado dentro del rango", async () => {
    let t = Date.UTC(2026, 9, 10, 15);
    const repo = crearRepoMemoria(() => t, {
      completarDemo: false,
      semilla: false,
    });
    const a = await repo.crear(10_000, "");
    await repo.marcarCobrado(a.numero, "x");
    t = Date.UTC(2026, 10, 2, 15);
    const b = await repo.crear(4_000, "");
    await repo.marcarCobrado(b.numero, "x");

    const octubre = await repo.resumenCobrado(
      Date.UTC(2026, 9, 1, 5),
      Date.UTC(2026, 10, 1, 5),
    );
    expect(octubre).toEqual({ total: 10_000, cobros: 1 });
    const todo = await repo.resumenCobrado(0, Date.UTC(2027, 0, 1));
    expect(todo).toEqual({ total: 14_000, cobros: 2 });
  });
});
