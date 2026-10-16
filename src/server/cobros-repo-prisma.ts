import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  PROCESO_DEMO_MS,
  VENCE_EN_MS,
  type Cobro,
  type CobroResumen,
  type Evento,
} from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import type { RepoCobros, ResultadoPago } from "./tipos";

type FilaCobro = Prisma.CobroGetPayload<{ include: { comercio: true } }>;

const INTENTOS_CODIGO = 5;
const PORDEN_EVENTOS = [{ creadoEn: "asc" }, { id: "asc" }] as const;

const esViolacionUnica = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

function codigoAleatorio(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

function resumen(f: FilaCobro): CobroResumen {
  return {
    numero: f.numero,
    codigo: f.codigo,
    comercio: f.comercio.nombre,
    monto: f.monto,
    concepto: f.concepto,
    estado: f.estado,
    creadoEn: f.creadoEn.toISOString(),
    venceEn: f.venceEn.toISOString(),
    ...(f.pagadoEn ? { pagadoEn: f.pagadoEn.toISOString() } : {}),
  };
}

/**
 * Los cambios por tiempo se aplican al leer, con la hora en que de verdad debieron
 * pasar. Cada cambio es una comparación y asignación atómica (`updateMany` con el
 * estado esperado): si dos lecturas coinciden, solo una lo aplica y deja el evento.
 * Sin temporizadores en el proceso: sobrevive a reinicios.
 */
async function aplicarTiempo(prisma: PrismaClient, ahora: Date): Promise<void> {
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

  // ponytail: confirmación simulada a los 5 s; la real vendrá de Open Payments.
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

  async function iniciarPago(
    buscar: (prisma: PrismaClient) => Promise<FilaCobro | null>,
    detalle: string,
  ): Promise<ResultadoPago> {
    const prisma = obtenerPrisma();
    await aplicarTiempo(prisma, ahora());
    const fila = await buscar(prisma);
    if (!fila) return { ok: false, motivo: "no_encontrado" };

    // Comparación y asignación atómica: dos aprobaciones a la vez no pueden pasar las dos.
    const aprobado = await prisma.$transaction(async (tx) => {
      const { count } = await tx.cobro.updateMany({
        where: { id: fila.id, estado: "esperando" },
        data: { estado: "procesando" },
      });
      if (count !== 1) return false;
      await tx.evento.create({
        data: {
          cobroId: fila.id,
          tipo: "aprobacion_iniciada",
          detalle,
          creadoEn: ahora(),
        },
      });
      return true;
    });
    if (aprobado) return { ok: true, estado: "procesando" };

    const actual = await prisma.cobro.findUniqueOrThrow({
      where: { id: fila.id },
      select: { estado: true },
    });
    return { ok: false, motivo: "no_disponible", estado: actual.estado };
  }

  return {
    async crear(monto, concepto) {
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
                codigo: codigoAleatorio(),
                monto,
                concepto,
                creadoEn: creado,
                venceEn: new Date(creado.getTime() + VENCE_EN_MS),
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
      await aplicarTiempo(prisma, ahora());
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
      await aplicarTiempo(prisma, ahora());
      const fila = await porNumero(prisma, numero);
      return fila ? conEventos(prisma, fila) : undefined;
    },

    async registrarDelCliente(numero, tipo) {
      const prisma = obtenerPrisma();
      const fila = await porNumero(prisma, numero);
      if (!fila) return false;
      await prisma.evento.create({
        data: { cobroId: fila.id, tipo, creadoEn: ahora() },
      });
      return true;
    },

    async verComoPagador(codigo) {
      const prisma = obtenerPrisma();
      await aplicarTiempo(prisma, ahora());
      const fila = await porCodigo(prisma, codigo);
      if (!fila) return undefined;
      if (fila.estado === "esperando") {
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
      }
      return {
        comercio: fila.comercio.nombre,
        monto: fila.monto,
        concepto: fila.concepto,
        estado: fila.estado,
        venceEn: fila.venceEn.toISOString(),
      };
    },

    aprobarComoPagador: (codigo, wallet) =>
      iniciarPago((prisma) => porCodigo(prisma, codigo), wallet),

    simularPago: (numero) =>
      iniciarPago(
        (prisma) => porNumero(prisma, numero),
        "simulado por el vendedor (demo)",
      ),
  };
}
