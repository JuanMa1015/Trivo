import { readFileSync } from "node:fs";
import { Pool } from "pg";

const global = globalThis as unknown as { __trivoPool?: Pool };

function esLocal(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Pool único por proceso, creado al primer uso (así `next build` no necesita secretos).
 * Supabase exige SSL. Con DATABASE_SSL_CA_PATH se verifica el servidor.
 * ponytail: sin esa CA se cifra pero no se verifica la identidad del servidor;
 * descargar la CA de Supabase y fijar la variable antes de producción.
 */
export function obtenerPool(): Pool {
  if (global.__trivoPool) return global.__trivoPool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL (la necesita COBROS_STORE=postgres)");
  }

  const caPath = process.env.DATABASE_SSL_CA_PATH;
  const ssl = esLocal(url)
    ? undefined
    : caPath
      ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true }
      : { rejectUnauthorized: false };

  const pool = new Pool({
    connectionString: url,
    ssl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  // Un cliente ocioso que se cae no debe tumbar el proceso.
  pool.on("error", (error) =>
    console.error("pg: error en cliente ocioso", error.message),
  );

  return (global.__trivoPool = pool);
}
