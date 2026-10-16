import { randomInt } from "node:crypto";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  estaVencido,
  type Cobro,
  type CobroResumen,
  type TipoEvento,
} from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import type { RepoCobros, ResultadoPago } from "./tipos";

function resumen(c: Cobro): CobroResumen {
  return {
    numero: c.numero,
    codigo: c.codigo,
    comercio: c.comercio,
    monto: c.monto,
    concepto: c.concepto,
    estado: c.estado,
    creadoEn: c.creadoEn,
    venceEn: c.venceEn,
    ...(c.pagadoEn ? { pagadoEn: c.pagadoEn } : {}),
  };
}

/**
 * Almacén en memoria: demo y tests. Mismo contrato que el de Postgres.
 * ponytail: se pierde al reiniciar y no escala a varias instancias.
 */
export function crearRepoMemoria(ahora: () => number = Date.now): RepoCobros {
  const cobros = new Map<number, Cobro>();
  let siguiente = 1;

  const iso = (ms: number) => new Date(ms).toISOString();

  function registrar(
    c: Cobro,
    tipo: TipoEvento,
    detalle?: string,
    en = ahora(),
  ) {
    c.eventos.push({ tipo, en: iso(en), ...(detalle ? { detalle } : {}) });
  }

  /**
   * Los cambios por tiempo ocurren al leer, con la hora en que de verdad
   * debieron pasar: vence a los 10 min; el pago de demo se confirma a los 5 s.
   */
  function refrescar(c: Cobro): Cobro {
    if (estaVencido(c, ahora())) {
      c.estado = "vencido";
      registrar(c, "vencido", undefined, Date.parse(c.venceEn));
    }
    if (c.estado === "procesando") {
      const aprobado = c.eventos.findLast(
        (e) => e.tipo === "aprobacion_iniciada",
      );
      const listo = aprobado
        ? Date.parse(aprobado.en) + PROCESO_DEMO_MS
        : Infinity;
      if (ahora() >= listo) {
        c.estado = "cobrado";
        c.pagadoEn = iso(listo);
        registrar(c, "cobrado", "demo: pago simulado", listo);
      }
    }
    return c;
  }

  function codigoLibre(): string {
    const usados = new Set([...cobros.values()].map((c) => c.codigo));
    for (;;) {
      const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
      if (!usados.has(codigo)) return codigo;
    }
  }

  function nuevo(monto: number, concepto: string): Cobro {
    const creado = ahora();
    const cobro: Cobro = {
      numero: siguiente++,
      codigo: codigoLibre(),
      comercio: COMERCIO_EJEMPLO,
      monto,
      concepto,
      estado: "esperando",
      creadoEn: iso(creado),
      venceEn: iso(creado + VENCE_EN_MS),
      eventos: [],
    };
    registrar(cobro, "creado");
    cobros.set(cobro.numero, cobro);
    return cobro;
  }

  const porNumero = (numero: number) => {
    const c = cobros.get(numero);
    return c && refrescar(c);
  };

  const porCodigo = (codigo: string) => {
    const c = [...cobros.values()].find((x) => x.codigo === codigo);
    return c && refrescar(c);
  };

  function iniciarPago(c: Cobro | undefined, detalle: string): ResultadoPago {
    if (!c) return { ok: false, motivo: "no_encontrado" };
    refrescar(c);
    if (c.estado !== "esperando") {
      return { ok: false, motivo: "no_disponible", estado: c.estado };
    }
    c.estado = "procesando";
    registrar(c, "aprobacion_iniciada", detalle);
    return { ok: true, estado: c.estado };
  }

  // Semilla de demo para que el talonario no arranque vacío.
  for (const [monto, concepto, minutos, estado] of [
    [18_000, "Comida", 95, "vencido"],
    [120_000, "Servicio", 40, "cobrado"],
    [35_000, "Ropa", 12, "cobrado"],
  ] as const) {
    const c = nuevo(monto, concepto);
    const hace = minutos * 60_000;
    c.creadoEn = iso(ahora() - hace);
    c.venceEn = iso(ahora() - hace + VENCE_EN_MS);
    c.eventos[0].en = c.creadoEn;
    c.estado = estado;
    if (estado === "cobrado") {
      c.pagadoEn = iso(ahora() - hace + 60_000);
      registrar(c, "cobrado", "demo: dato de ejemplo", ahora() - hace + 60_000);
    } else {
      registrar(c, "vencido", undefined, Date.parse(c.venceEn));
    }
  }

  return {
    async crear(monto, concepto) {
      return nuevo(monto, concepto);
    },
    async listar() {
      return [...cobros.values()]
        .map(refrescar)
        .sort((a, b) => b.numero - a.numero)
        .map(resumen);
    },
    async obtener(numero) {
      return porNumero(numero);
    },
    async registrarDelCliente(numero, tipo) {
      const c = porNumero(numero);
      if (!c) return false;
      registrar(c, tipo);
      return true;
    },
    async verComoPagador(codigo) {
      const c = porCodigo(codigo);
      if (!c) return undefined;
      if (
        c.estado === "esperando" &&
        !c.eventos.some((e) => e.tipo === "abierto_por_pagador")
      ) {
        registrar(c, "abierto_por_pagador");
      }
      const { comercio, monto, concepto, estado, venceEn } = c;
      return { comercio, monto, concepto, estado, venceEn };
    },
    async aprobarComoPagador(codigo, wallet) {
      return iniciarPago(porCodigo(codigo), wallet);
    },
    async simularPago(numero) {
      return iniciarPago(porNumero(numero), "simulado por el vendedor (demo)");
    },
  };
}
