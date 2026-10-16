import { z } from "zod";

export const ESTADOS = [
  "esperando",
  "procesando",
  "cobrado",
  "vencido",
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
};

export type Evento = { tipo: TipoEvento; en: string; detalle?: string };

export type Cobro = {
  numero: number;
  codigo: string;
  comercio: string;
  monto: number;
  concepto: string;
  estado: Estado;
  creadoEn: string;
  venceEn: string;
  pagadoEn?: string;
  eventos: Evento[];
};

/** El talonario no necesita la trazabilidad de cada cobro. */
export type CobroResumen = Omit<Cobro, "eventos">;

/** Lo único que ve quien paga: nada de eventos ni de numeración interna. */
export type PagoPublico = Pick<
  Cobro,
  "comercio" | "monto" | "concepto" | "estado" | "venceEn"
>;

export const VENCE_EN_MS = 10 * 60 * 1000;
export const PROCESO_DEMO_MS = 5_000;
export const MAX_MONTO = 999_999_999;

export const crearCobroSchema = z.object({
  monto: z.number().int().positive().max(MAX_MONTO),
  concepto: z.string().trim().max(30).default(""),
});

export const eventoClienteSchema = z.object({
  tipo: z.enum(["compartido_whatsapp", "link_copiado"]),
});

export const aprobarSchema = z.object({
  wallet: z
    .string()
    .trim()
    .regex(/^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/, "https:// wallet address")
    .max(200),
});

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
