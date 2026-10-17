"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";

/*
 * Idioma del pagador: se recuerda entre /pagar y /p/[token] (y entre visitas). La primera
 * vez sigue el idioma del navegador. En el servidor siempre es español.
 */
const CLAVE = "trivo.lang";
const EVENTO = "trivo:lang";

function leer(): Lang {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "es" || guardado === "en") return guardado;
  } catch {
    // Sin almacenamiento: se usa el idioma del navegador.
  }
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function guardar(lang: Lang) {
  try {
    localStorage.setItem(CLAVE, lang);
  } catch {
    // Sin almacenamiento: el cambio dura solo en esta pantalla.
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function useIdioma(): [Lang, (lang: Lang) => void] {
  const lang = useSyncExternalStore(suscribir, leer, () => "es" as const);
  return [lang, guardar];
}
