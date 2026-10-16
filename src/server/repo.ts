import { crearRepoMemoria } from "./cobros-repo-memoria";
import { crearRepoPostgres } from "./cobros-repo-pg";
import { obtenerPool } from "./db";
import type { RepoCobros } from "./tipos";

const global = globalThis as unknown as { __trivoRepo?: RepoCobros };

/**
 * Almacén activo. COBROS_STORE=postgres usa Supabase; si no, memoria (demo).
 * Una sola instancia por proceso, también tras recargas en desarrollo.
 */
export const repo: RepoCobros = (global.__trivoRepo ??=
  process.env.COBROS_STORE === "postgres"
    ? crearRepoPostgres(obtenerPool)
    : crearRepoMemoria());
