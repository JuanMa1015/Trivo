import type { Pool, PoolClient } from "pg";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  type Cobro,
  type CobroResumen,
  type Estado,
  type Evento,
  type TipoEvento,
} from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import type { RepoCobros, ResultadoPago } from "./tipos";

type Db = Pool | PoolClient;

type FilaCobro = {
  id: string;
  numero: number;
  codigo: string;
  comercio: string;
  monto: string; // bigint llega como texto
  concepto: string;
  estado: Estado;
  creado_en: Date;
  vence_en: Date;
  pagado_en: Date | null;
};

const COLUMNAS = `c.id, c.numero, c.codigo, m.nombre as comercio, c.monto::text as monto,
  c.concepto, c.estado, c.creado_en, c.vence_en, c.pagado_en`;
const DESDE = "from cobros c join comercios m on m.id = c.comercio_id";
const INTENTOS_CODIGO = 5;
const CODIGO_REPETIDO = "23505";

function resumen(f: FilaCobro): CobroResumen {
  return {
    numero: f.numero,
    codigo: f.codigo,
    comercio: f.comercio,
    monto: Number(f.monto),
    concepto: f.concepto,
    estado: f.estado,
    creadoEn: f.creado_en.toISOString(),
    venceEn: f.vence_en.toISOString(),
    ...(f.pagado_en ? { pagadoEn: f.pagado_en.toISOString() } : {}),
  };
}

async function conEventos(db: Db, f: FilaCobro): Promise<Cobro> {
  const { rows } = await db.query<{
    tipo: TipoEvento;
    detalle: string | null;
    creado_en: Date;
  }>(
    "select tipo, detalle, creado_en from eventos where cobro_id = $1 order by creado_en, id",
    [f.id],
  );
  const eventos: Evento[] = rows.map((e) => ({
    tipo: e.tipo,
    en: e.creado_en.toISOString(),
    ...(e.detalle ? { detalle: e.detalle } : {}),
  }));
  return { ...resumen(f), eventos };
}

/**
 * Los cambios por tiempo se aplican al leer, con la hora en que de verdad
 * debieron pasar, y de forma segura si dos lecturas coinciden (el estado se
 * vuelve a comprobar tras el bloqueo de fila). Sin temporizadores en el proceso:
 * sobrevive a reinicios.
 */
async function aplicarTiempo(db: Db): Promise<void> {
  await db.query(`
    with v as (
      update cobros set estado = 'vencido'
      where estado = 'esperando' and vence_en <= now()
      returning id, vence_en)
    insert into eventos (cobro_id, tipo, creado_en)
    select id, 'vencido', vence_en from v`);

  // ponytail: confirmación simulada a los 5 s; la real vendrá de Open Payments.
  await db.query(
    `
    with p as (
      select c.id,
        (select max(e.creado_en) from eventos e
          where e.cobro_id = c.id and e.tipo = 'aprobacion_iniciada')
          + make_interval(secs => $1::double precision) as listo_en
      from cobros c where c.estado = 'procesando'),
    u as (
      update cobros set estado = 'cobrado', pagado_en = p.listo_en
      from p
      where cobros.id = p.id and cobros.estado = 'procesando' and p.listo_en <= now()
      returning cobros.id, p.listo_en)
    insert into eventos (cobro_id, tipo, detalle, creado_en)
    select id, 'cobrado', 'demo: pago simulado', listo_en from u`,
    [PROCESO_DEMO_MS / 1000],
  );
}

export function crearRepoPostgres(obtenerPool: () => Pool): RepoCobros {
  let comercioId: string | undefined;

  async function comercio(): Promise<string> {
    if (comercioId) return comercioId;
    const pool = obtenerPool();
    const existente = await pool.query<{ id: string }>(
      "select id from comercios where nombre = $1 order by creado_en limit 1",
      [COMERCIO_EJEMPLO],
    );
    if (existente.rows[0]) return (comercioId = existente.rows[0].id);
    // ponytail: un único comercio de demo hasta tener cuentas de vendedor.
    const nuevo = await pool.query<{ id: string }>(
      "insert into comercios (nombre) values ($1) returning id",
      [COMERCIO_EJEMPLO],
    );
    return (comercioId = nuevo.rows[0].id);
  }

  async function transaccion<T>(
    trabajo: (db: PoolClient) => Promise<T>,
  ): Promise<T> {
    const db = await obtenerPool().connect();
    try {
      await db.query("begin");
      const resultado = await trabajo(db);
      await db.query("commit");
      return resultado;
    } catch (error) {
      await db.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      db.release();
    }
  }

  async function porNumero(
    db: Db,
    numero: number,
  ): Promise<FilaCobro | undefined> {
    const { rows } = await db.query<FilaCobro>(
      `select ${COLUMNAS} ${DESDE} where c.comercio_id = $1 and c.numero = $2`,
      [await comercio(), numero],
    );
    return rows[0];
  }

  async function porCodigo(
    db: Db,
    codigo: string,
  ): Promise<FilaCobro | undefined> {
    const { rows } = await db.query<FilaCobro>(
      `select ${COLUMNAS} ${DESDE} where c.codigo = $1 order by c.creado_en desc limit 1`,
      [codigo],
    );
    return rows[0];
  }

  async function iniciarPago(
    buscar: (db: PoolClient) => Promise<FilaCobro | undefined>,
    detalle: string,
  ): Promise<ResultadoPago> {
    return transaccion(async (db) => {
      await aplicarTiempo(db);
      const fila = await buscar(db);
      if (!fila) return { ok: false, motivo: "no_encontrado" } as const;

      // Bloquea la fila: dos aprobaciones a la vez no pueden pasar las dos.
      const { rows } = await db.query<{ estado: Estado }>(
        "select estado from cobros where id = $1 for update",
        [fila.id],
      );
      const estado = rows[0].estado;
      if (estado !== "esperando") {
        return { ok: false, motivo: "no_disponible", estado } as const;
      }

      await db.query("update cobros set estado = 'procesando' where id = $1", [
        fila.id,
      ]);
      await db.query(
        "insert into eventos (cobro_id, tipo, detalle) values ($1, 'aprobacion_iniciada', $2)",
        [fila.id, detalle],
      );
      return { ok: true, estado: "procesando" } as const;
    });
  }

  return {
    async crear(monto, concepto) {
      const idComercio = await comercio();
      return transaccion(async (db) => {
        const { rows: n } = await db.query<{ numero: number }>(
          "select siguiente_numero($1) as numero",
          [idComercio],
        );

        for (let intento = 1; ; intento++) {
          const codigo = String(Math.floor(Math.random() * 1_000_000)).padStart(
            6,
            "0",
          );
          await db.query("savepoint codigo");
          try {
            const { rows } = await db.query<{ id: string }>(
              `insert into cobros (comercio_id, numero, codigo, monto, concepto, vence_en)
               values ($1, $2, $3, $4, $5, now() + make_interval(secs => $6::double precision))
               returning id`,
              [
                idComercio,
                n[0].numero,
                codigo,
                monto,
                concepto,
                VENCE_EN_MS / 1000,
              ],
            );
            await db.query(
              "insert into eventos (cobro_id, tipo) values ($1, 'creado')",
              [rows[0].id],
            );
            const { rows: filas } = await db.query<FilaCobro>(
              `select ${COLUMNAS} ${DESDE} where c.id = $1`,
              [rows[0].id],
            );
            return conEventos(db, filas[0]);
          } catch (error) {
            const repetido =
              (error as { code?: string }).code === CODIGO_REPETIDO;
            if (!repetido || intento >= INTENTOS_CODIGO) throw error;
            await db.query("rollback to savepoint codigo");
          }
        }
      });
    },

    async listar() {
      const pool = obtenerPool();
      await aplicarTiempo(pool);
      const { rows } = await pool.query<FilaCobro>(
        `select ${COLUMNAS} ${DESDE} where c.comercio_id = $1
         order by c.numero desc limit 100`,
        [await comercio()],
      );
      return rows.map(resumen);
    },

    async obtener(numero) {
      const pool = obtenerPool();
      await aplicarTiempo(pool);
      const fila = await porNumero(pool, numero);
      return fila && conEventos(pool, fila);
    },

    async registrarDelCliente(numero, tipo) {
      const pool = obtenerPool();
      const fila = await porNumero(pool, numero);
      if (!fila) return false;
      await pool.query("insert into eventos (cobro_id, tipo) values ($1, $2)", [
        fila.id,
        tipo,
      ]);
      return true;
    },

    async verComoPagador(codigo) {
      const pool = obtenerPool();
      await aplicarTiempo(pool);
      const fila = await porCodigo(pool, codigo);
      if (!fila) return undefined;
      if (fila.estado === "esperando") {
        await pool.query(
          `insert into eventos (cobro_id, tipo)
           select $1, 'abierto_por_pagador'
           where not exists (
             select 1 from eventos where cobro_id = $1 and tipo = 'abierto_por_pagador')`,
          [fila.id],
        );
      }
      return {
        comercio: fila.comercio,
        monto: Number(fila.monto),
        concepto: fila.concepto,
        estado: fila.estado,
        venceEn: fila.vence_en.toISOString(),
      };
    },

    aprobarComoPagador: (codigo, wallet) =>
      iniciarPago((db) => porCodigo(db, codigo), wallet),

    simularPago: (numero) =>
      iniciarPago(
        async (db) => porNumero(db, numero),
        "simulado por el vendedor (demo)",
      ),
  };
}
