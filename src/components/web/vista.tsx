"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const ESCRITORIO = "(min-width: 64rem)";

function suscribir(avisar: () => void) {
  const consulta = window.matchMedia(ESCRITORIO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/**
 * ¿Se ve la composición de escritorio? En el servidor (y al hidratar) es `null`:
 * se dibujan las dos y el CSS oculta una. Ya en el navegador solo se dibuja la que
 * se ve, así cada pantalla no re-renderiza un árbol oculto cada segundo.
 */
export function useEsEscritorio(): boolean | null {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(ESCRITORIO).matches,
    () => null,
  );
}

/** Contenido móvil: no se dibuja cuando ya se sabe que la ventana es de escritorio. */
export function SoloMovil({ children }: { children: ReactNode }) {
  return useEsEscritorio() === true ? null : children;
}

/** Contenido de escritorio: no se dibuja cuando ya se sabe que la ventana es móvil. */
export function SoloEscritorio({ children }: { children: ReactNode }) {
  return useEsEscritorio() === false ? null : children;
}
