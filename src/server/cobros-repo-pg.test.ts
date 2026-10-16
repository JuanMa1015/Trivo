import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROCESO_DEMO_MS, VENCE_EN_MS } from "@/lib/cobros";
import { crearRepoPostgres } from "./cobros-repo-pg";

/**
 * Pruebas de integración contra una base Postgres desechable con la migración
 * 0001 aplicada. Solo corren si existe TEST_DATABASE_URL. Los eventos son
 * inmutables, así que estas pruebas dejan filas: usa una base local, nunca Supabase.
 */
const url = process.env.TEST_DATABASE_URL;
if (url && /supabase\.(co|com)/.test(url)) {
  throw new Error(
    "TEST_DATABASE_URL apunta a Supabase: usa una base local desechable.",
  );
}

describe.skipIf(!url)("repositorio Postgres", () => {
  let pool: Pool;
  let repo: ReturnType<typeof crearRepoPostgres>;

  beforeAll(() => {
    pool = new Pool({ connectionString: url });
    repo = crearRepoPostgres(() => pool);
  });
  afterAll(() => pool.end());

  it("crea un cobro con número, código, vencimiento a 10 minutos y evento inicial", async () => {
    const a = await repo.crear(50_000, "Ropa");
    const b = await repo.crear(2_000, "");
    expect(b.numero).toBe(a.numero + 1);
    expect(a.codigo).toMatch(/^\d{6}$/);
    expect(a.estado).toBe("esperando");
    expect(Date.parse(a.venceEn) - Date.parse(a.creadoEn)).toBe(VENCE_EN_MS);
    expect(a.eventos.map((e) => e.tipo)).toEqual(["creado"]);
  });

  it("rechaza datos inválidos desde la base", async () => {
    await expect(repo.crear(0, "")).rejects.toThrow();
    await expect(repo.crear(1_000_000_000, "")).rejects.toThrow();
  });

  it("el talonario no trae eventos y empieza por el más nuevo", async () => {
    const c = await repo.crear(1_000, "");
    const lista = await repo.listar();
    expect(lista[0].numero).toBe(c.numero);
    expect("eventos" in lista[0]).toBe(false);
  });

  it("registra la primera apertura del pagador una sola vez", async () => {
    const c = await repo.crear(3_000, "");
    await repo.verComoPagador(c.codigo);
    await repo.verComoPagador(c.codigo);
    const eventos = (await repo.obtener(c.numero))?.eventos.map((e) => e.tipo);
    expect(eventos?.filter((t) => t === "abierto_por_pagador")).toHaveLength(1);
  });

  it("pasa por procesando y termina cobrado a los 5 segundos, sin cobrar dos veces", async () => {
    const c = await repo.crear(50_000, "Ropa");
    expect(
      await repo.aprobarComoPagador(c.codigo, "https://ilp.dev/w"),
    ).toEqual({
      ok: true,
      estado: "procesando",
    });
    expect(
      await repo.aprobarComoPagador(c.codigo, "https://ilp.dev/w"),
    ).toMatchObject({
      ok: false,
      motivo: "no_disponible",
    });

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

  it("vence al leer, deja constancia y no deja pagar", async () => {
    const c = await repo.crear(7_000, "");
    await pool.query(
      `update cobros set creado_en = now() - interval '11 minutes',
         vence_en = now() - interval '1 second'
       where codigo = $1 and estado = 'esperando'`,
      [c.codigo],
    );
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
      pool.query("update eventos set detalle = 'x'"),
    ).rejects.toThrow(/solo agregar/);
    await expect(pool.query("delete from eventos")).rejects.toThrow(
      /solo agregar/,
    );
  });
});
