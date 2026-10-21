import { z } from "zod";

/**
 * Cuenta del comercio: usuario, nombre del comercio, contraseña y la wallet donde cobra.
 * No se pide al empezar: cualquiera cobra como invitado hasta este número de cobros; después
 * debe crear la cuenta, que conserva los cobros que ya hizo.
 */
export const LIMITE_COBROS_SIN_REGISTRO = 5;
/** Nombre del comercio mientras el vendedor no lo escribe al crear su cuenta. */
export const COMERCIO_INVITADO = "Mi comercio";

export type Perfil = {
  registrado: boolean;
  /** Nombre de usuario; no existe hasta que el comercio se registra. */
  usuario?: string;
  comercio: string;
  /** Wallet donde cobra; ausente en un invitado (cobra en la de la plataforma). */
  wallet?: string;
  /** Cobros creados hasta ahora: sirve para el aviso y para la obligación de registrarse. */
  cobrosCreados: number;
  limite: number;
};

/** Cuántos cobros le quedan antes de que registrarse sea obligatorio. */
export function cobrosRestantes(p: Pick<Perfil, "cobrosCreados" | "limite">) {
  return Math.max(p.limite - p.cobrosCreados, 0);
}

export const registroSchema = z.object({
  usuario: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[\p{L}\p{N}._-]+$/u)
    .transform((u) => u.toLowerCase()),
  comercio: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(100),
  /** Dirección de la wallet de Open Payments donde recibirá sus cobros. */
  wallet: z.string().trim().min(8).max(300),
});

export const accesoSchema = z.object({
  usuario: z.string().trim().min(1).max(30),
  password: z.string().min(1).max(100),
});
