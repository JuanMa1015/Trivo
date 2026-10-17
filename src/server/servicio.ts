import {
  crearRepoIntentosMemoria,
  crearRepoMemoria,
} from "./cobros-repo-memoria";
import { crearRepoPrisma } from "./cobros-repo-prisma";
import { crearRepoIntentosPrisma } from "./intentos-repo-prisma";
import { crearPuertoOpenPayments } from "./open-payments/adaptador";
import { leerConfigOpenPayments } from "./open-payments/config";
import {
  crearServicioDemo,
  crearServicioOpenPayments,
  type ServicioPagos,
} from "./pagos";
import { obtenerPrisma } from "./prisma";
import { crearTasaReferencia } from "./tasas";

const global = globalThis as unknown as { __trivoServicio?: ServicioPagos };

/**
 * Servicio activo, creado al primer uso (así `next build` no necesita secretos).
 *   COBROS_STORE=postgres   guarda en Supabase vía Prisma; si no, en memoria.
 *   COBROS_RAIL=open-payments  paga de verdad con Open Payments; si no, pago simulado.
 * Una sola instancia por proceso, también tras recargas en desarrollo.
 */
export function obtenerServicio(): ServicioPagos {
  if (global.__trivoServicio) return global.__trivoServicio;

  const real = process.env.COBROS_RAIL === "open-payments";
  const postgres = process.env.COBROS_STORE === "postgres";
  const opciones = { completarDemo: !real, semilla: !real };

  const repo = postgres
    ? crearRepoPrisma(obtenerPrisma, undefined, opciones)
    : crearRepoMemoria(undefined, opciones);
  const intentos = postgres
    ? crearRepoIntentosPrisma(obtenerPrisma)
    : crearRepoIntentosMemoria();

  if (!real)
    return (global.__trivoServicio = crearServicioDemo({ repo, intentos }));

  const config = leerConfigOpenPayments();
  return (global.__trivoServicio = crearServicioOpenPayments({
    repo,
    intentos,
    puerto: crearPuertoOpenPayments(config),
    config,
    tasaReferencia: crearTasaReferencia(),
  }));
}
