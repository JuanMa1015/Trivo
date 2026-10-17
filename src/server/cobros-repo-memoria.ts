import { randomUUID } from "node:crypto";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  estaVencido,
  type Cobro,
  type CobroResumen,
  type TipoEvento,
} from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import { nuevoCodigo, nuevoToken } from "./confirmacion";
import type {
  Intento,
  NuevoIntento,
  OpcionesRepo,
  RepoCobros,
  RepoIntentos,
  ResultadoPago,
} from "./tipos";

function resumen(c: Cobro): CobroResumen {
  return {
    id: c.id,
    numero: c.numero,
    codigo: c.codigo,
    token: c.token,
    comercio: c.comercio,
    monto: c.monto,
    concepto: c.concepto,
    estado: c.estado,
    creadoEn: c.creadoEn,
    venceEn: c.venceEn,
    ...(c.pagadoEn ? { pagadoEn: c.pagadoEn } : {}),
    ...(c.incomingPaymentUrl
      ? { incomingPaymentUrl: c.incomingPaymentUrl }
      : {}),
    ...(c.outgoingPaymentUrl
      ? { outgoingPaymentUrl: c.outgoingPaymentUrl }
      : {}),
  };
}

/**
 * Almacén en memoria: demo y tests. Mismo contrato que el de Postgres.
 * ponytail: se pierde al reiniciar y no escala a varias instancias.
 */
export function crearRepoMemoria(
  ahora: () => number = Date.now,
  opciones: OpcionesRepo = { completarDemo: true, semilla: true },
): RepoCobros {
  const cobros = new Map<number, Cobro>();
  // Aparte del Cobro para que nunca viaje por la API.
  const tokensDePago = new Map<number, string>();
  let siguiente = 1;

  const iso = (ms: number) => new Date(ms).toISOString();

  function registrarEn(
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
      registrarEn(c, "vencido", undefined, Date.parse(c.venceEn));
    }
    if (opciones.completarDemo && c.estado === "procesando") {
      const aprobado = c.eventos.findLast(
        (e) => e.tipo === "aprobacion_iniciada",
      );
      const listo = aprobado
        ? Date.parse(aprobado.en) + PROCESO_DEMO_MS
        : Infinity;
      if (ahora() >= listo) {
        c.estado = "cobrado";
        c.pagadoEn = iso(listo);
        registrarEn(c, "cobrado", "demo: pago simulado", listo);
      }
    }
    return c;
  }

  function codigoLibre(): string {
    const usados = new Set([...cobros.values()].map((c) => c.codigo));
    for (;;) {
      const codigo = nuevoCodigo();
      if (!usados.has(codigo)) return codigo;
    }
  }

  function nuevo(
    monto: number,
    concepto: string,
    extra?: { incomingPaymentUrl?: string },
  ): Cobro {
    const creado = ahora();
    const cobro: Cobro = {
      id: randomUUID(),
      numero: siguiente++,
      codigo: codigoLibre(),
      token: nuevoToken(),
      comercio: COMERCIO_EJEMPLO,
      monto,
      concepto,
      estado: "esperando",
      creadoEn: iso(creado),
      venceEn: iso(creado + VENCE_EN_MS),
      ...(extra?.incomingPaymentUrl
        ? { incomingPaymentUrl: extra.incomingPaymentUrl }
        : {}),
      eventos: [],
    };
    registrarEn(cobro, "creado");
    cobros.set(cobro.numero, cobro);
    return cobro;
  }

  const porNumero = (numero: number) => {
    const c = cobros.get(numero);
    return c && refrescar(c);
  };

  const porCodigo = (codigo: string) => {
    const c = [...cobros.values()]
      .filter((x) => x.codigo === codigo)
      .sort((a, b) => b.numero - a.numero)[0];
    return c && refrescar(c);
  };

  const porToken = (token: string) => {
    const c = [...cobros.values()].find((x) => x.token === token);
    return c && refrescar(c);
  };

  // Semilla de demo para que el talonario no arranque vacío.
  if (opciones.semilla) {
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
        registrarEn(
          c,
          "cobrado",
          "demo: dato de ejemplo",
          ahora() - hace + 60_000,
        );
      } else {
        registrarEn(c, "vencido", undefined, Date.parse(c.venceEn));
      }
    }
  }

  return {
    async crear(monto, concepto, extra) {
      return nuevo(monto, concepto, extra);
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
    async obtenerPorCodigo(codigo) {
      return porCodigo(codigo);
    },
    async obtenerPorId(id) {
      const c = [...cobros.values()].find((x) => x.id === id);
      return c && refrescar(c);
    },
    async registrar(numero, tipo, detalle) {
      const c = porNumero(numero);
      if (!c) return false;
      registrarEn(c, tipo, detalle);
      return true;
    },
    async obtenerPorToken(token) {
      return porToken(token);
    },
    async registrarApertura(token) {
      const c = porToken(token);
      if (
        c &&
        c.estado === "esperando" &&
        !c.eventos.some((e) => e.tipo === "abierto_por_pagador")
      ) {
        registrarEn(c, "abierto_por_pagador");
      }
    },

    async iniciarPagoDemo(numero, detalle): Promise<ResultadoPago> {
      const c = porNumero(numero);
      if (!c) return { ok: false, motivo: "no_encontrado" };
      if (c.estado !== "esperando") {
        return { ok: false, motivo: "no_disponible", estado: c.estado };
      }
      c.estado = "procesando";
      registrarEn(c, "aprobacion_iniciada", detalle);
      return { ok: true, estado: c.estado };
    },

    async marcarProcesando(numero, outgoingPaymentUrl, tokenPago) {
      const c = porNumero(numero);
      if (!c || c.estado !== "esperando") return false;
      c.estado = "procesando";
      c.outgoingPaymentUrl = outgoingPaymentUrl;
      if (tokenPago) tokensDePago.set(numero, tokenPago);
      registrarEn(c, "pago_enviado");
      return true;
    },
    async marcarCobrado(numero, detalle) {
      const c = porNumero(numero);
      if (!c || (c.estado !== "esperando" && c.estado !== "procesando"))
        return false;
      c.estado = "cobrado";
      tokensDePago.delete(numero);
      c.pagadoEn = iso(ahora());
      registrarEn(c, "cobrado", detalle);
      return true;
    },
    async marcarFallido(numero, detalle) {
      const c = porNumero(numero);
      if (!c || c.estado !== "procesando") return false;
      c.estado = "fallido";
      tokensDePago.delete(numero);
      registrarEn(c, "pago_fallido", detalle);
      return true;
    },
    async tokenDePago(numero) {
      return tokensDePago.get(numero);
    },
    async listarProcesando() {
      return [...cobros.values()]
        .map(refrescar)
        .filter((c) => c.estado === "procesando");
    },
  };
}

/** Intentos de pago en memoria (demo y tests). */
export function crearRepoIntentosMemoria(): RepoIntentos {
  const intentos = new Map<string, Intento>();
  return {
    async crear(nuevo: NuevoIntento) {
      const intento: Intento = { id: randomUUID(), ...nuevo };
      intentos.set(intento.id, intento);
      return intento;
    },
    async obtener(id) {
      return intentos.get(id);
    },
    async guardarContinuacion(id, continuacion) {
      const intento = intentos.get(id);
      if (intento) intento.continuacion = continuacion;
    },
  };
}
