import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PROCESO_DEMO_MS, VENCE_EN_MS } from "@/lib/cobros";
import { crearRepoPrisma } from "./cobros-repo-prisma";

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
  let repo: ReturnType<typeof crearRepoPrisma>;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
    repo = crearRepoPrisma(() => prisma);
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
      repo.verComoPagador(c.codigo),
      repo.verComoPagador(c.codigo),
      repo.verComoPagador(c.codigo),
    ]);
    const eventos = (await repo.obtener(c.numero))?.eventos.map((e) => e.tipo);
    expect(eventos?.filter((t) => t === "abierto_por_pagador")).toHaveLength(1);
  });

  it("pasa por procesando y termina cobrado a los 5 segundos, sin cobrar dos veces", async () => {
    const c = await repo.crear(50_000, "Ropa");
    const [uno, dos] = await Promise.all([
      repo.aprobarComoPagador(c.codigo, "https://ilp.dev/w"),
      repo.aprobarComoPagador(c.codigo, "https://ilp.dev/w"),
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
    expect(await repo.simularPago(c.numero)).toEqual({
      ok: false,
      motivo: "no_disponible",
      estado: "vencido",
    });
    const vencidos = (await repo.obtener(c.numero))?.eventos.filter(
      (e) => e.tipo === "vencido",
    );
    expect(vencidos).toHaveLength(1);
  });

  it("el pagador solo ve lo necesario y un código inexistente no existe", async () => {
    const c = await repo.crear(9_000, "Comida");
    expect(
      Object.keys((await repo.verComoPagador(c.codigo)) ?? {}).sort(),
    ).toEqual(["comercio", "concepto", "estado", "monto", "venceEn"]);
    expect(await repo.verComoPagador("999999")).toBeUndefined();
  });

  it("los eventos no se pueden modificar ni borrar", async () => {
    await expect(
      prisma.evento.updateMany({ data: { detalle: "x" } }),
    ).rejects.toThrow();
    await expect(prisma.evento.deleteMany({})).rejects.toThrow();
  });
});
