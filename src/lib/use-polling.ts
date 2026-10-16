"use client";

import { useEffect, useState } from "react";

type Estado = "cargando" | "ok" | "no_encontrado" | "error";
type Lectura<T> = { data: T | null; estado: Estado };

/** Consulta una URL cada `cadaMs` para mostrar el estado en vivo. */
export function usePolling<T>(url: string, cadaMs: number): Lectura<T> {
  const [lectura, setLectura] = useState<Lectura<T>>({
    data: null,
    estado: "cargando",
  });

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!activo) return;
        if (r.status === 404) {
          setLectura({ data: null, estado: "no_encontrado" });
          return;
        }
        if (!r.ok) throw new Error(String(r.status));
        setLectura({ data: (await r.json()) as T, estado: "ok" });
      } catch {
        if (activo) setLectura((previa) => ({ ...previa, estado: "error" }));
      }
    }

    void cargar();
    const id = setInterval(cargar, cadaMs);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, [url, cadaMs]);

  return lectura;
}

/** Reloj para cuentas regresivas; se actualiza cada `cadaMs`. */
export function useAhora(cadaMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);
  return ahora;
}
