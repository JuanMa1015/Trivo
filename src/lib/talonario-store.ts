"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { RECIBOS_EJEMPLO, reciboSchema, type Recibo } from "./talonario";

// Prototype storage: per-tab sessionStorage. Replaced by Supabase with the backend.
const KEY = "trivo.talonario";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function leer(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function parsear(raw: string): Recibo[] {
  if (!raw) return RECIBOS_EJEMPLO;
  try {
    const result = z.array(reciboSchema).safeParse(JSON.parse(raw));
    return result.success ? result.data : RECIBOS_EJEMPLO;
  } catch {
    return RECIBOS_EJEMPLO;
  }
}

export function useTalonario() {
  const raw = useSyncExternalStore(subscribe, leer, () => "");
  const recibos = useMemo(() => parsear(raw), [raw]);

  const guardar = useCallback((siguiente: Recibo[]) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(siguiente));
    } catch {
      // Storage unavailable (private mode): the demo keeps working without persistence.
    }
    listeners.forEach((l) => l());
  }, []);

  // False on the server and during hydration, so screens never flash sample data.
  const listo = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return { recibos, guardar, listo };
}
