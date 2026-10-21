import { randomUUID } from "node:crypto";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  estaVencido,
  type Cobro,
  type CobroResumen,
  type TipoEvento,
} from "@/lib/cobros";
import { limitesDelAnio } from "@/lib/impuestos";
import { COMERCIO_INVITADO, LIMITE_COBROS_SIN_REGISTRO } from "@/lib/perfil";
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
    comercioId: c.comercioId,
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
    ...(c.walletReceptora ? { walletReceptora: c.walletReceptora } : {}),
  };
}

type ComercioMem = {
  id: string;
  nombre: string;
  usuario?: string;
  passwordHash?: string;
  wallet?: string;
  ultimoNumero: number;
  /** Cuándo empezó el comercio en Trivo: antes no hay ventas que certificar. */
  creadoEn: string;
};

/**
 * Almacén en memoria: demo y tests. Mismo contrato que el de Postgres.
 * ponytail: se pierde al reiniciar y no escala a varias instancias.
 */
export function crearRepoMemoria(
  ahora: () => number = Date.now,
  opciones: OpcionesRepo = { completarDemo: true },
): RepoCobros {
  const comercios = new Map<string, ComercioMem>();
  const cobros: Cobro[] = [];
  // Aparte del Cobro para que nunca viaje por la API.
  const tokensDePago = new Map<string, string>();

  const iso = (ms: number) => new Date(ms).toISOString();
  const clave = (comercioId: string, numero: number) =>
    `${comercioId}:${numero}`;

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
    const usados = new Set(cobros.map((c) => c.codigo));
    for (;;) {
      const codigo = nuevoCodigo();
      if (!usados.has(codigo)) return codigo;
    }
  }

  const porNumero = (comercioId: string, numero: number) => {
    const c = cobros.find(
      (x) => x.comercioId === comercioId && x.numero === numero,
    );
    return c && refrescar(c);
  };

  const porCodigo = (codigo: string) => {
    const c = cobros
      .filter((x) => x.codigo === codigo)
      .sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))[0];
    return c && refrescar(c);
  };

  const porToken = (token: string) => {
    const c = cobros.find((x) => x.token === token);
    return c && refrescar(c);
  };

  const delComercio = (comercioId: string) =>
    cobros.filter((c) => c.comercioId === comercioId).map(refrescar);

  const enRango = (c: Cobro, desde: number, hasta: number) =>
    c.estado === "cobrado" &&
    c.pagadoEn !== undefined &&
    Date.parse(c.pagadoEn) >= desde &&
    Date.parse(c.pagadoEn) < hasta;

  const delUsuario = (usuario: string) =>
    [...comercios.values()].find(
      (c) => c.usuario?.toLowerCase() === usuario.toLowerCase(),
    );

  return {
    async crear(comercioId, monto, concepto, extra) {
      const comercio = comercios.get(comercioId);
      if (!comercio) throw new Error("comercio inexistente");
      const creado = ahora();
      comercio.ultimoNumero += 1;
      const cobro: Cobro = {
        id: randomUUID(),
        comercioId,
        numero: comercio.ultimoNumero,
        codigo: codigoLibre(),
        token: nuevoToken(),
        comercio: comercio.nombre,
        monto,
        concepto,
        estado: "esperando",
        creadoEn: iso(creado),
        venceEn: iso(creado + VENCE_EN_MS),
        ...(extra?.incomingPaymentUrl
          ? { incomingPaymentUrl: extra.incomingPaymentUrl }
          : {}),
        ...(extra?.walletReceptora
          ? { walletReceptora: extra.walletReceptora }
          : {}),
        eventos: [],
      };
      registrarEn(cobro, "creado");
      cobros.push(cobro);
      return cobro;
    },
    async listar(comercioId) {
      return delComercio(comercioId)
        .sort((a, b) => b.numero - a.numero)
        .slice(0, 100)
        .map(resumen);
    },
    async obtener(comercioId, numero) {
      return porNumero(comercioId, numero);
    },
    async obtenerPorCodigo(codigo) {
      return porCodigo(codigo);
    },
    async obtenerPorId(id, comercioId) {
      const c = cobros.find(
        (x) => x.id === id && (!comercioId || x.comercioId === comercioId),
      );
      return c && refrescar(c);
    },
    async registrar(comercioId, numero, tipo, detalle) {
      const c = porNumero(comercioId, numero);
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

    async iniciarPagoDemo(comercioId, numero, detalle): Promise<ResultadoPago> {
      const c = porNumero(comercioId, numero);
      if (!c) return { ok: false, motivo: "no_encontrado" };
      if (c.estado !== "esperando") {
        return { ok: false, motivo: "no_disponible", estado: c.estado };
      }
      c.estado = "procesando";
      registrarEn(c, "aprobacion_iniciada", detalle);
      return { ok: true, estado: c.estado };
    },

    async marcarProcesando(comercioId, numero, outgoingPaymentUrl, tokenPago) {
      const c = porNumero(comercioId, numero);
      if (!c || c.estado !== "esperando") return false;
      c.estado = "procesando";
      c.outgoingPaymentUrl = outgoingPaymentUrl;
      if (tokenPago) tokensDePago.set(clave(comercioId, numero), tokenPago);
      registrarEn(c, "pago_enviado");
      return true;
    },
    async marcarCobrado(comercioId, numero, detalle) {
      const c = porNumero(comercioId, numero);
      if (!c || (c.estado !== "esperando" && c.estado !== "procesando"))
        return false;
      c.estado = "cobrado";
      tokensDePago.delete(clave(comercioId, numero));
      c.pagadoEn = iso(ahora());
      registrarEn(c, "cobrado", detalle);
      return true;
    },
    async marcarFallido(comercioId, numero, detalle) {
      const c = porNumero(comercioId, numero);
      if (!c || c.estado !== "procesando") return false;
      c.estado = "fallido";
      tokensDePago.delete(clave(comercioId, numero));
      registrarEn(c, "pago_fallido", detalle);
      return true;
    },
    async tokenDePago(comercioId, numero) {
      return tokensDePago.get(clave(comercioId, numero));
    },
    async totalCobradoDelAnio(comercioId, anio) {
      const { desde, hasta } = limitesDelAnio(anio);
      return delComercio(comercioId)
        .filter((c) => enRango(c, desde, hasta))
        .reduce((suma, c) => suma + c.monto, 0);
    },
    async resumenCobrado(comercioId, desde, hasta) {
      const dentro = delComercio(comercioId).filter((c) =>
        enRango(c, desde, hasta),
      );
      return {
        total: dentro.reduce((suma, c) => suma + c.monto, 0),
        cobros: dentro.length,
      };
    },

    async crearInvitado() {
      const id = randomUUID();
      comercios.set(id, {
        id,
        nombre: COMERCIO_INVITADO,
        ultimoNumero: 0,
        creadoEn: iso(ahora()),
      });
      return id;
    },
    async perfil(comercioId) {
      const c = comercios.get(comercioId);
      if (!c) return undefined;
      return {
        registrado: c.usuario !== undefined,
        ...(c.usuario ? { usuario: c.usuario } : {}),
        comercio: c.nombre,
        ...(c.wallet ? { wallet: c.wallet } : {}),
        cobrosCreados: c.ultimoNumero,
        limite: LIMITE_COBROS_SIN_REGISTRO,
        creadoEn: c.creadoEn,
      };
    },
    async registrarCuenta({
      comercioId,
      usuario,
      comercio,
      passwordHash,
      wallet,
    }) {
      if (delUsuario(usuario)) return { ok: false, motivo: "usuario_en_uso" };
      let c = comercioId ? comercios.get(comercioId) : undefined;
      if (comercioId && (!c || c.usuario !== undefined))
        return { ok: false, motivo: "ya_registrado" };
      if (!c) {
        c = {
          id: randomUUID(),
          nombre: comercio,
          ultimoNumero: 0,
          creadoEn: iso(ahora()),
        };
        comercios.set(c.id, c);
      }
      Object.assign(c, { usuario, nombre: comercio, passwordHash, wallet });
      // Los cobros del invitado se quedan con la cuenta y muestran el nombre nuevo.
      for (const x of cobros) if (x.comercioId === c.id) x.comercio = comercio;
      return { ok: true, comercioId: c.id };
    },
    async cuentaDe(usuario) {
      const c = delUsuario(usuario);
      return c?.passwordHash
        ? { comercioId: c.id, passwordHash: c.passwordHash }
        : undefined;
    },
    async listarProcesando() {
      return cobros.map(refrescar).filter((c) => c.estado === "procesando");
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
