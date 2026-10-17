"use client";

import { useSyncExternalStore } from "react";

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/**
 * Aviso cuando el dispositivo se queda sin internet. Las pantallas siguen sondeando como
 * siempre; esto solo explica por qué los datos dejan de moverse.
 */
export function AvisoConexion() {
  const enLinea = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
  if (enLinea) return null;
  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-50 bg-secondary px-4 py-2 text-center text-sm font-bold text-white lg:text-web-sm"
    >
      Sin conexión. Los cobros se actualizan cuando vuelva el internet. · You
      are offline.
    </p>
  );
}
