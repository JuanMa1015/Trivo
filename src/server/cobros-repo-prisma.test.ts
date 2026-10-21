import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PROCESO_DEMO_MS, VENCE_EN_MS } from "@/lib/cobros";
import { crearRepoPrisma } from "./cobros-repo-prisma";
import { crearRepoIntentosPrisma } from "./intentos-repo-prisma";
import { atado } from "./prueba-comercio";

/**
 * Pruebas de integración contra una base Postgres desechable con las migraciones
 * aplicadas (`npm run db:migrate`). Solo corren si existe TEST_DATABASE_URL.
 * Los eventos son inmutables, así que estas pruebas dejan filas: usa una base
 * local o la del CI, nunca Supabase.
 */
const url = process.env.TEST_DATABASE_URL;
if (url && /supabase\.(co|com)/.test(url)) {
  throw new Error(
    "TEST_DATABASE_URL apunta a Supabase: usa una base local desechable.",
  );
}

describe.skipIf(!url)("repositorio Prisma", () => {
  let prisma: PrismaClient;
  let base: ReturnType<typeof crearRepoPrisma>;
  // El mismo repositorio atado a un comercio nuevo: las pruebas viejas no repiten el id.
  let repo: ReturnType<typeof atado>;
  // Open Payments real: el repositorio no confirma pagos por su cuenta.
  let repoReal: ReturnType<typeof atado>;
  let intentos: ReturnType<typeof crearRepoIntentosPrisma>;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
    base = crearRepoPrisma(() => prisma);
    repo = atado(base);
    repoReal = atado(
      crearRepoPrisma(() => prisma, undefined, { completarDemo: false }),
      repo.id,
    );
    intentos = crearRepoIntentosPrisma(() => prisma);
  });
  afterAll(() => prisma.$disconnect());

  it("crea un cobro con número, código, vencimiento a 10 minutos y evento inicial", async () => {
    const a = await repo.crear(50_000, "Ropa");
    const b = await repo.crear(2_000, "");
    expect(b.numero).toBe(a.numero + 1);
    expect(a.codigo).toMatch(/^\d{6}$/);
    expect(a.estado).toBe("esperando");
    expect(Date.parse(a.venceEn) - Date.parse(a.creadoEn)).toBe(VENCE_EN_MS);
    expect(a.eventos.map((e) => e.tipo)).toEqual(["creado"]);
  });

  it("guarda la URL del incoming payment y encuentra por código e id", async () => {
    const c = await repo.crear(4_000, "", {
      incomingPaymentUrl: "https://op.dev/incoming/1",
    });
    expect(c.incomingPaymentUrl).toBe("https://op.dev/incoming/1");
    expect((await repo.obtenerPorCodigo(c.codigo))?.numero).toBe(c.numero);
    expect((await repo.obtenerPorId(c.id))?.numero).toBe(c.numero);
    expect(await repo.obtenerPorCodigo("abcdef")).toBeUndefined();
  });

  it("el token es único y la base rechaza formatos que no sean de 22 caracteres", async () => {
    const a = await repo.crear(1_000, "");
    const b = await repo.crear(1_000, "");
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a.token).not.toBe(b.token);
    expect((await repo.obtenerPorToken(a.token))?.numero).toBe(a.numero);
    expect(await repo.obtenerPorToken("a".repeat(22))).toBeUndefined();

    await expect(
      prisma.cobro.update({ where: { id: a.id }, data: { token: "corto" } }),
    ).rejects.toThrow();
    await expect(
      prisma.cobro.update({ where: { id: a.id }, data: { token: b.token } }),
    ).rejects.toThrow();
  });

  it("la base rechaza montos fuera de rango", async () => {
    await expect(repo.crear(0, "")).rejects.toThrow();
    await expect(repo.crear(1_000_000_000, "")).rejects.toThrow();
  });

  it("el talonario no trae eventos y empieza por el más nuevo", async () => {
    const c = await repo.crear(1_000, "");
    const lista = await repo.listar();
    expect(lista[0].numero).toBe(c.numero);
    expect("eventos" in lista[0]).toBe(false);
  });

  it("registra la primera apertura del pagador una sola vez, incluso en paralelo", async () => {
    const c = await repo.crear(3_000, "");
    await Promise.all([
      repo.registrarApertura(c.token),
      repo.registrarApertura(c.token),
      repo.registrarApertura(c.token),
    ]);
    const eventos = (await repo.obtener(c.numero))?.eventos.map((e) => e.tipo);
    expect(eventos?.filter((t) => t === "abierto_por_pagador")).toHaveLength(1);
  });

  it("pago de demo: procesando y cobrado a los 5 segundos, sin cobrar dos veces", async () => {
    const c = await repo.crear(50_000, "Ropa");
    const [uno, dos] = await Promise.all([
      repo.iniciarPagoDemo(c.numero, "https://ilp.dev/w"),
      repo.iniciarPagoDemo(c.numero, "https://ilp.dev/w"),
    ]);
    expect([uno.ok, dos.ok].filter(Boolean)).toHaveLength(1);

    await new Promise((r) => setTimeout(r, PROCESO_DEMO_MS + 500));
    const final = await repo.obtener(c.numero);
    expect(final?.estado).toBe("cobrado");
    expect(final?.pagadoEn).toBeDefined();
    expect(final?.eventos.map((e) => e.tipo)).toEqual([
      "creado",
      "aprobacion_iniciada",
      "cobrado",
    ]);
  }, 20_000);

  it("vence al leer, deja constancia una vez y no deja pagar", async () => {
    const c = await repo.crear(7_000, "");
    await prisma.cobro.updateMany({
      where: { codigo: c.codigo, estado: "esperando" },
      data: {
        creadoEn: new Date(Date.now() - 11 * 60_000),
        venceEn: new Date(Date.now() - 1_000),
      },
    });
    await Promise.all([repo.obtener(c.numero), repo.obtener(c.numero)]);
    expect((await repo.obtener(c.numero))?.estado).toBe("vencido");
    expect(await repo.iniciarPagoDemo(c.numero, "demo")).toEqual({
      ok: false,
      motivo: "no_disponible",
      estado: "vencido",
    });
    const vencidos = (await repo.obtener(c.numero))?.eventos.filter(
      (e) => e.tipo === "vencido",
    );
    expect(vencidos).toHaveLength(1);
  });

  it("pago real: esperando -> procesando -> cobrado, cada paso con su evento", async () => {
    const c = await repoReal.crear(50_000, "", {
      incomingPaymentUrl: "https://op.dev/incoming/2",
    });
    expect(
      await repoReal.marcarProcesando(c.numero, "https://op.dev/out/1"),
    ).toBe(true);
    expect(
      await repoReal.marcarProcesando(c.numero, "https://op.dev/out/2"),
    ).toBe(false);
    expect((await repoReal.listarProcesando()).map((x) => x.numero)).toContain(
      c.numero,
    );

    // Con completarDemo apagado nada lo confirma solo, por mucho que pase el tiempo.
    await new Promise((r) => setTimeout(r, PROCESO_DEMO_MS + 500));
    expect((await repoReal.obtener(c.numero))?.estado).toBe("procesando");

    expect(await repoReal.marcarCobrado(c.numero, "confirmado")).toBe(true);
    expect(await repoReal.marcarCobrado(c.numero, "otra vez")).toBe(false);
    const final = await repoReal.obtener(c.numero);
    expect(final?.estado).toBe("cobrado");
    expect(final?.outgoingPaymentUrl).toBe("https://op.dev/out/1");
    expect(final?.eventos.map((e) => e.tipo)).toEqual([
      "creado",
      "pago_enviado",
      "cobrado",
    ]);
  }, 20_000);

  it("pago real: un pago que no llega queda fallido, y solo desde procesando", async () => {
    const c = await repoReal.crear(9_000, "");
    expect(await repoReal.marcarFallido(c.numero, "x")).toBe(false);
    await repoReal.marcarProcesando(c.numero, "https://op.dev/out/3");
    expect(await repoReal.marcarFallido(c.numero, "sin llegada")).toBe(true);
    const final = await repoReal.obtener(c.numero);
    expect(final?.estado).toBe("fallido");
    expect(final?.eventos.at(-1)).toMatchObject({
      tipo: "pago_fallido",
      detalle: "sin llegada",
    });
  });

  it("intentos de pago: guarda la cotización y la continuación del grant", async () => {
    const c = await repo.crear(6_000, "");
    const intento = await intentos.crear({
      cobroId: c.id,
      walletPagador: "https://ilp.interledger-test.dev/pagador",
      nombrePagador: "Pagador",
      quoteUrl: "https://op.dev/quotes/1",
      debito: { valor: "1574", codigo: "USD", escala: 2 },
      recibe: { valor: "600000", codigo: "COP", escala: 2 },
      venceEn: new Date(Date.now() + 300_000).toISOString(),
    });
    expect((await intentos.obtener(intento.id))?.continuacion).toBeUndefined();

    await intentos.guardarContinuacion(intento.id, {
      continueUri: "https://auth.op.dev/continue/1",
      continueToken: "TOKEN",
      nonceCliente: "nc",
      nonceAs: "na",
    });
    const guardado = await intentos.obtener(intento.id);
    expect(guardado?.debito).toEqual({
      valor: "1574",
      codigo: "USD",
      escala: 2,
    });
    expect(guardado?.continuacion).toEqual({
      continueUri: "https://auth.op.dev/continue/1",
      continueToken: "TOKEN",
      nonceCliente: "nc",
      nonceAs: "na",
    });
    expect(
      await intentos.obtener("00000000-0000-4000-8000-000000000000"),
    ).toBeUndefined();
  });

  it("intentos de pago: la base rechaza wallets no https e importes no numéricos", async () => {
    const c = await repo.crear(6_500, "");
    const base = {
      cobroId: c.id,
      nombrePagador: null,
      quoteUrl: "https://op.dev/quotes/2",
      debito: { valor: "1574", codigo: "USD", escala: 2 },
      recibe: { valor: "650000", codigo: "COP", escala: 2 },
      venceEn: new Date(Date.now() + 300_000).toISOString(),
    };
    await expect(
      intentos.crear({ ...base, walletPagador: "http://inseguro.dev/x" }),
    ).rejects.toThrow();
    await expect(
      intentos.crear({
        ...base,
        walletPagador: "https://ilp.interledger-test.dev/x",
        debito: { valor: "no-numero", codigo: "USD", escala: 2 },
      }),
    ).rejects.toThrow();
  });

  describe("varios comercios", () => {
    const cuenta = (usuario: string) => ({
      usuario,
      comercio: "Tienda de prueba",
      passwordHash: "scrypt$a$b",
      wallet: "https://ilp.interledger-test.dev/prueba",
    });
    const unico = () => `p${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    it("cada comercio ve solo lo suyo, aunque el número se repita", async () => {
      const a = await base.crearInvitado();
      const b = await base.crearInvitado();
      const deA = await base.crear(a, 1_000, "de A");
      const deB = await base.crear(b, 2_000, "de B");
      expect(deA.numero).toBe(1);
      expect(deB.numero).toBe(1);
      expect((await base.listar(a)).map((c) => c.concepto)).toEqual(["de A"]);
      expect((await base.obtener(b, 1))?.concepto).toBe("de B");
      expect(await base.obtenerPorId(deA.id, b)).toBeUndefined();
      expect(await base.marcarCobrado(b, deA.numero + 5, "x")).toBe(false);
      expect(await base.totalCobradoDelAnio(a, 2026)).toBe(0);
    });

    it("el invitado se vuelve cuenta sin perder sus cobros", async () => {
      const id = await base.crearInvitado();
      const antes = await base.crear(id, 1_000, "primero");
      const usuario = unico();
      expect(
        await base.registrarCuenta({ comercioId: id, ...cuenta(usuario) }),
      ).toEqual({
        ok: true,
        comercioId: id,
      });
      expect(await base.perfil(id)).toMatchObject({
        registrado: true,
        usuario,
        comercio: "Tienda de prueba",
        wallet: "https://ilp.interledger-test.dev/prueba",
        cobrosCreados: 1,
      });
      expect((await base.obtener(id, antes.numero))?.comercio).toBe(
        "Tienda de prueba",
      );
      expect((await base.crear(id, 2_000, "")).numero).toBe(2);
      expect(
        await base.registrarCuenta({ comercioId: id, ...cuenta(unico()) }),
      ).toEqual({ ok: false, motivo: "ya_registrado" });
    });

    it("el usuario es único sin importar mayúsculas, también en paralelo", async () => {
      const usuario = unico();
      const [uno, dos] = await Promise.all([
        base.registrarCuenta(cuenta(usuario)),
        base.registrarCuenta(cuenta(usuario.toUpperCase())),
      ]);
      expect([uno.ok, dos.ok].filter(Boolean)).toHaveLength(1);
      expect((await base.cuentaDe(usuario.toUpperCase()))?.passwordHash).toBe(
        "scrypt$a$b",
      );
      expect(await base.cuentaDe(`${usuario}x`)).toBeUndefined();
    });

    it("guarda en el cobro la wallet donde se cobró", async () => {
      const id = await base.crearInvitado();
      const c = await base.crear(id, 1_000, "", {
        walletReceptora: "https://ilp.interledger-test.dev/prueba",
      });
      expect(c.walletReceptora).toBe("https://ilp.interledger-test.dev/prueba");
      expect((await base.crear(id, 1_000, "")).walletReceptora).toBeUndefined();
    });

    it("la base valida el formato de la contraseña y de las wallets", async () => {
      await expect(
        prisma.comercio.updateMany({ data: { passwordHash: "md5$x" } }),
      ).rejects.toThrow();
      await expect(
        prisma.comercio.updateMany({ data: { walletUrl: "http://inseguro" } }),
      ).rejects.toThrow();
      const id = await base.crearInvitado();
      await expect(
        base.crear(id, 1_000, "", { walletReceptora: "ftp://x" }),
      ).rejects.toThrow();
    });
  });

  it("resumenCobrado suma lo cobrado en el rango", async () => {
    const c = await repo.crear(3_333, "");
    await repo.marcarCobrado(c.numero, "x");
    const ahoraMs = Date.now();
    const { total, cobros } = await repo.resumenCobrado(
      ahoraMs - 60_000,
      ahoraMs + 60_000,
    );
    expect(total).toBeGreaterThanOrEqual(3_333);
    expect(cobros).toBeGreaterThanOrEqual(1);
  });

  it("los eventos no se pueden modificar ni borrar", async () => {
    await expect(
      prisma.evento.updateMany({ data: { detalle: "x" } }),
    ).rejects.toThrow();
    await expect(prisma.evento.deleteMany({})).rejects.toThrow();
  });
});
