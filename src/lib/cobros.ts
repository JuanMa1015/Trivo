import { z } from "zod";

export const ESTADOS = [
  "esperando",
  "procesando",
  "cobrado",
  "vencido",
  /** El pago salió pero la wallet del pagador no lo completó (por ejemplo, sin saldo). */
  "fallido",
] as const;
export type Estado = (typeof ESTADOS)[number];

export const TIPOS_EVENTO = [
  "creado",
  "compartido_whatsapp",
  "link_copiado",
  "abierto_por_pagador",
  "aprobacion_iniciada",
  "cobrado",
  "vencido",
  // Open Payments real:
  "cotizado",
  "consentimiento_iniciado",
  "pago_enviado",
  "pago_fallido",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  creado: "Cobro creado",
  compartido_whatsapp: "Enviado por WhatsApp",
  link_copiado: "Link copiado",
  abierto_por_pagador: "El pagador abrió el cobro",
  aprobacion_iniciada: "El pagador aprobó en su wallet",
  cobrado: "Pago confirmado",
  vencido: "Venció sin pagarse",
  cotizado: "El pagador vio el precio",
  consentimiento_iniciado: "El pagador pasó a su wallet para aprobar",
  pago_enviado: "El pagador aprobó y el pago salió de su wallet",
  pago_fallido: "El pago no se completó",
};

export type Evento = { tipo: TipoEvento; en: string; detalle?: string };

export type Cobro = {
  /** Identificador interno; no se muestra al pagador. */
  id: string;
  numero: number;
  /** 6 dígitos para decirlos en voz alta. Solo sirve para encontrar el token; no para pagar. */
  codigo: string;
  /** Secreto único del cobro (128 bits) que viaja en el link y el QR. */
  token: string;
  comercio: string;
  monto: number;
  concepto: string;
  estado: Estado;
  creadoEn: string;
  venceEn: string;
  pagadoEn?: string;
  /** Solo existe cuando el dinero ya llegó; el servidor lo firma con un secreto. */
  confirmacion?: string;
  /** Objetos de Open Payments (URLs públicas); vacíos en el modo demo. */
  incomingPaymentUrl?: string;
  outgoingPaymentUrl?: string;
  eventos: Evento[];
};

/** Quién paga, según la wallet que declaró al pedir precio o aprobar. */
export function pagadorDe(cobro: Pick<Cobro, "eventos">): string | undefined {
  return cobro.eventos.findLast(
    (e) => e.tipo === "cotizado" || e.tipo === "consentimiento_iniciado",
  )?.detalle;
}

/** El talonario no necesita la trazabilidad de cada cobro. */
export type CobroResumen = Omit<Cobro, "eventos">;

/** Importe en unidades menores, como lo entrega Open Payments (valor entero en texto). */
export type Monto = { valor: string; codigo: string; escala: number };

export const montoANumero = (m: Monto): number =>
  Number(m.valor) / 10 ** m.escala;

/**
 * Cuánto recibe el vendedor por cada unidad que paga el pagador (por ejemplo
 * COP por USD). Nulo si ambos importes están en la misma moneda.
 */
export function tasaImplicita(debito: Monto, recibe: Monto): number | null {
  if (debito.codigo === recibe.codigo) return null;
  const pagado = montoANumero(debito);
  return pagado > 0 ? montoANumero(recibe) / pagado : null;
}

/** Lo único que ve quien paga: nada de eventos ni de numeración interna. */
export type PagoPublico = Pick<
  Cobro,
  "comercio" | "monto" | "concepto" | "estado" | "venceEn"
> & {
  /** Nombre que la wallet receptora declara públicamente: confirma que se paga a la persona correcta. */
  receptor: string;
  /** Dirección pública de esa wallet, para compararla si hay dudas. */
  receptorWallet: string;
  pagadoEn?: string;
  /** Mismo código que verá el vendedor en su pantalla cuando el dinero llegó. */
  confirmacion?: string;
};

/** Precio exacto que verá el pagador antes de aprobar. */
export type CotizacionPublica = {
  intentoId: string;
  receptor: string;
  pagador: string | null;
  debito: Monto;
  recibe: Monto;
  /** Unidades de la moneda del cobro por cada unidad que paga el pagador, a precio de mercado. */
  tasaReferencia: number | null;
  venceEn: string;
};

/**
 * Cuánto de lo que paga el pagador es costo de la conversión de su wallet: lo que
 * paga de más frente a pagar la misma cantidad a la tasa de referencia.
 */
export function costoConversion(
  debito: Monto,
  recibe: Monto,
  tasaReferencia: number | null,
): { monto: Monto; porcentaje: number } | null {
  if (!tasaReferencia || debito.codigo === recibe.codigo) return null;
  const justo = montoANumero(recibe) / tasaReferencia;
  const pagado = montoANumero(debito);
  const extra = pagado - justo;
  if (extra <= 0 || pagado <= 0) return null;
  return {
    monto: {
      valor: String(Math.round(extra * 10 ** debito.escala)),
      codigo: debito.codigo,
      escala: debito.escala,
    },
    porcentaje: (extra / pagado) * 100,
  };
}

export const VENCE_EN_MS = 10 * 60 * 1000;
export const PROCESO_DEMO_MS = 5_000;
/** Si la wallet no avisa un fallo, un pago enviado que no llega en este tiempo se da por fallido. */
export const PAGO_SIN_CONFIRMAR_MS = 3 * 60 * 1000;
export const MAX_MONTO = 999_999_999;

export const crearCobroSchema = z.object({
  monto: z.number().int().positive().max(MAX_MONTO),
  concepto: z.string().trim().max(30).default(""),
});

export const eventoClienteSchema = z.object({
  tipo: z.enum(["compartido_whatsapp", "link_copiado"]),
});

export const walletUrlSchema = z
  .string()
  .trim()
  .regex(/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/, "https:// wallet address")
  .max(200);

/** Token del link y el QR: 16 bytes aleatorios en base64url (22 caracteres). */
export const TOKEN_BYTES = 16;
export const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

export const resolverSchema = z.object({ codigo: z.string().regex(/^\d{6}$/) });

export const cotizarSchema = z.object({ wallet: walletUrlSchema });

export const aprobarSchema = z.object({ intentoId: z.uuid() });

export function estaVencido(
  cobro: Pick<Cobro, "estado" | "venceEn">,
  ahora: number = Date.now(),
): boolean {
  return cobro.estado === "esperando" && ahora >= Date.parse(cobro.venceEn);
}

export function segundosRestantes(
  venceEn: string,
  ahora: number = Date.now(),
): number {
  return Math.max(0, Math.ceil((Date.parse(venceEn) - ahora) / 1000));
}

export function formatearCuentaRegresiva(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
