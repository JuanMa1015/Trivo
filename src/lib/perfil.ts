import { z } from "zod";

/**
 * Cuenta del comercio: usuario, nombre del comercio y contraseña. No se pide al empezar:
 * se recuerda con un aviso y pasa a ser obligatoria al llegar a este número de cobros.
 * ponytail: una sola cuenta por despliegue; con varios comercios cada uno tendría la suya.
 */
export const LIMITE_COBROS_SIN_REGISTRO = 5;

export type Perfil = {
  registrado: boolean;
  /** Nombre de usuario; no existe hasta que el comercio se registra. */
  usuario?: string;
  comercio: string;
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
    .regex(/^[\p{L}\p{N}._-]+$/u),
  comercio: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(100),
  /** La clave del vendedor: autoriza crear la cuenta. */
  pin: z.string().max(128).optional(),
});
