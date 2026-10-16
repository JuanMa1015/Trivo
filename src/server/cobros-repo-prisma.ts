import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  type Cobro,
  type CobroResumen,
  type Evento,
} from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import { nuevoCodigo, nuevoToken } from "./confirmacion";
import type { OpcionesRepo, RepoCobros, ResultadoPago } from "./tipos";

type FilaCobro = Prisma.CobroGetPayload<{ include: { comercio: true } }>;

const INTENTOS_CODIGO = 5;
const PORDEN_EVENTOS = [{ creadoEn: "asc" }, { id: "asc" }] as const;

export const esViolacionUnica = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

function resumen(f: FilaCobro): CobroResumen {
  return {
    id: f.id,
    numero: f.numero,
    codigo: f.codigo,
    token: f.token,
    comercio: f.comercio.nombre,
    monto: f.monto,
    concepto: f.concepto,
    estado: f.estado,
    creadoEn: f.creadoEn.toISOString(),
    venceEn: f.venceEn.toISOString(),
    ...(f.pagadoEn ? { pagadoEn: f.pagadoEn.toISOString() } : {}),
    ...(f.incomingPaymentUrl
      ? { incomingPaymentUrl: f.incomingPaymentUrl }
      : {}),
    ...(f.outgoingPaymentUrl
      ? { outgoingPaymentUrl: f.outgoingPaymentUrl }
      : {}),
  };
}

/**
 * Los cambios por tiempo se aplican al leer, con la hora en que de verdad debieron
 * pasar. Cada cambio es una comparación y asignación atómica (`updateMany` con el
 * estado esperado): si dos lecturas coinciden, solo una lo aplica y deja el evento.
 * Sin temporizadores en el proceso: sobrevive a reinicios.
 */
async function aplicarTiempo(
  prisma: PrismaClient,
  ahora: Date,
  completarDemo: boolean,
): Promise<void> {
  const porVencer = await prisma.cobro.findMany({
    where: { estado: "esperando", venceEn: { lte: ahora } },
    select: { id: true, venceEn: true },
  });
  for (const c of porVencer) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.cobro.updateMany({
        where: { id: c.id, estado: "esperando" },
        data: { estado: "vencido" },
      });
      if (count === 1) {
        await tx.evento.create({
          data: { cobroId: c.id, tipo: "vencido", creadoEn: c.venceEn },
        });
      }
    });
  }

  if (!completarDemo) return;

  // ponytail: confirmación simulada a los 5 s; con Open Payments real la confirma el riel.
  const procesando = await prisma.cobro.findMany({
    where: { estado: "procesando" },
    select: {
      id: true,
      eventos: {
        where: { tipo: "aprobacion_iniciada" },
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: { creadoEn: true },
      },
    },
  });
  for (const c of procesando) {
    const aprobado = c.eventos[0]?.creadoEn;
    if (!aprobado) continue;
    const listo = new Date(aprobado.getTime() + PROCESO_DEMO_MS);
    if (listo > ahora) continue;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.cobro.updateMany({
        where: { id: c.id, estado: "procesando" },
        data: { estado: "cobrado", pagadoEn: listo },
      });
      if (count === 1) {
        await tx.evento.create({
          data: {
            cobroId: c.id,
            tipo: "cobrado",
            detalle: "demo: pago simulado",
            creadoEn: listo,
          },
        });
      }
    });
  }
}

export function crearRepoPrisma(
  obtenerPrisma: () => PrismaClient,
  ahora: () => Date = () => new Date(),
  opciones: OpcionesRepo = { completarDemo: true, semilla: false },
): RepoCobros {
  let comercioId: string | undefined;

  async function comercio(): Promise<string> {
    if (comercioId) return comercioId;
    const prisma = obtenerPrisma();
    const existente = await prisma.comercio.findFirst({
      where: { nombre: COMERCIO_EJEMPLO },
      orderBy: { creadoEn: "asc" },
      select: { id: true },
    });
    if (existente) return (comercioId = existente.id);
    // ponytail: un único comercio de demo hasta tener cuentas de vendedor.
    const nuevo = await prisma.comercio.create({
      data: { nombre: COMERCIO_EJEMPLO },
      select: { id: true },
    });
    return (comercioId = nuevo.id);
  }

  const refrescar = (prisma: PrismaClient) =>
    aplicarTiempo(prisma, ahora(), opciones.completarDemo);

  async function porNumero(prisma: PrismaClient, numero: number) {
    return prisma.cobro.findUnique({
      where: { comercioId_numero: { comercioId: await comercio(), numero } },
      include: { comercio: true },
    });
  }

  const porCodigo = (prisma: PrismaClient, codigo: string) =>
    prisma.cobro.findFirst({
      where: { codigo },
      orderBy: { creadoEn: "desc" },
      include: { comercio: true },
    });

  const porToken = (prisma: PrismaClient, token: string) =>
    prisma.cobro.findUnique({ where: { token }, include: { comercio: true } });

  async function conEventos(
    prisma: PrismaClient,
    fila: FilaCobro,
  ): Promise<Cobro> {
    const filas = await prisma.evento.findMany({
      where: { cobroId: fila.id },
      orderBy: [...PORDEN_EVENTOS],
    });
    const eventos: Evento[] = filas.map((e) => ({
      tipo: e.tipo,
      en: e.creadoEn.toISOString(),
      ...(e.detalle ? { detalle: e.detalle } : {}),
    }));
    return { ...resumen(fila), eventos };
  }

  /**
   * Cambio de estado atómico: solo se aplica si el cobro está en uno de los
   * estados de origen, y deja su evento en la misma transacción.
   */
  async function transicion(
    numero: number,
    desde: Cobro["estado"][],
    datos: Prisma.CobroUpdateManyMutationInput,
    evento: { tipo: Evento["tipo"]; detalle?: string },
  ): Promise<boolean> {
    const prisma = obtenerPrisma();
    await refrescar(prisma);
    const fila = await porNumero(prisma, numero);
    if (!fila) return false;
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.cobro.updateMany({
        where: { id: fila.id, estado: { in: desde } },
        data: datos,
      });
      if (count !== 1) return false;
      await tx.evento.create({
        data: {
          cobroId: fila.id,
          tipo: evento.tipo,
          detalle: evento.detalle,
          creadoEn: ahora(),
        },
      });
      return true;
    });
  }

  return {
    async crear(monto, concepto, extra) {
      const prisma = obtenerPrisma();
      const idComercio = await comercio();

      // Si el código aleatorio choca con uno en uso (índice único), se reintenta
      // toda la transacción: una violación aborta la transacción en Postgres.
      for (let intento = 1; ; intento++) {
        try {
          const fila = await prisma.$transaction(async (tx) => {
            const { ultimoNumero } = await tx.comercio.update({
              where: { id: idComercio },
              data: { ultimoNumero: { increment: 1 } },
              select: { ultimoNumero: true },
            });
            const creado = ahora();
            return tx.cobro.create({
              data: {
                comercioId: idComercio,
                numero: ultimoNumero,
                codigo: nuevoCodigo(),
                token: nuevoToken(),
                monto,
                concepto,
                creadoEn: creado,
                venceEn: new Date(creado.getTime() + VENCE_EN_MS),
                incomingPaymentUrl: extra?.incomingPaymentUrl,
                eventos: { create: { tipo: "creado", creadoEn: creado } },
              },
              include: { comercio: true },
            });
          });
          return conEventos(prisma, fila);
        } catch (error) {
          if (!esViolacionUnica(error) || intento >= INTENTOS_CODIGO)
            throw error;
        }
      }
    },

    async listar() {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const filas = await prisma.cobro.findMany({
        where: { comercioId: await comercio() },
        orderBy: { numero: "desc" },
        take: 100,
        include: { comercio: true },
      });
      return filas.map(resumen);
    },

    async obtener(numero) {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const fila = await porNumero(prisma, numero);
      return fila ? conEventos(prisma, fila) : undefined;
    },

    async obtenerPorCodigo(codigo) {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const fila = await porCodigo(prisma, codigo);
      return fila ? conEventos(prisma, fila) : undefined;
    },

    async obtenerPorToken(token) {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const fila = await porToken(prisma, token);
      return fila ? conEventos(prisma, fila) : undefined;
    },

    async obtenerPorId(id) {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const fila = await prisma.cobro.findUnique({
        where: { id },
        include: { comercio: true },
      });
      return fila ? conEventos(prisma, fila) : undefined;
    },

    async registrar(numero, tipo, detalle) {
      const prisma = obtenerPrisma();
      const fila = await porNumero(prisma, numero);
      if (!fila) return false;
      await prisma.evento.create({
        data: { cobroId: fila.id, tipo, detalle, creadoEn: ahora() },
      });
      return true;
    },

    async registrarApertura(token) {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const fila = await porToken(prisma, token);
      if (!fila || fila.estado !== "esperando") return;
      try {
        await prisma.evento.create({
          data: {
            cobroId: fila.id,
            tipo: "abierto_por_pagador",
            creadoEn: ahora(),
          },
        });
      } catch (error) {
        // El índice único ya tiene la primera apertura: es lo esperado, no un fallo.
        if (!esViolacionUnica(error)) throw error;
      }
    },

    async iniciarPagoDemo(numero, detalle): Promise<ResultadoPago> {
      const prisma = obtenerPrisma();
      const aprobado = await transicion(
        numero,
        ["esperando"],
        { estado: "procesando" },
        { tipo: "aprobacion_iniciada", detalle },
      );
      if (aprobado) return { ok: true, estado: "procesando" };

      const fila = await porNumero(prisma, numero);
      if (!fila) return { ok: false, motivo: "no_encontrado" };
      return { ok: false, motivo: "no_disponible", estado: fila.estado };
    },

    marcarProcesando: (numero, outgoingPaymentUrl) =>
      transicion(
        numero,
        ["esperando"],
        { estado: "procesando", outgoingPaymentUrl },
        { tipo: "pago_enviado" },
      ),

    marcarCobrado: (numero, detalle) =>
      transicion(
        numero,
        ["esperando", "procesando"],
        { estado: "cobrado", pagadoEn: ahora() },
        { tipo: "cobrado", detalle },
      ),

    marcarFallido: (numero, detalle) =>
      transicion(
        numero,
        ["procesando"],
        { estado: "vencido" },
        { tipo: "pago_fallido", detalle },
      ),

    async listarProcesando() {
      const prisma = obtenerPrisma();
      await refrescar(prisma);
      const filas = await prisma.cobro.findMany({
        where: { estado: "procesando" },
        include: { comercio: true },
      });
      return Promise.all(filas.map((f) => conEventos(prisma, f)));
    },
  };
}
