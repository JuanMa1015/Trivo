"use client";

import { cobrosRestantes, type Perfil } from "@/lib/perfil";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import { usePolling } from "@/lib/use-polling";

/**
 * Usuario y nombre del comercio para las pantallas del vendedor, y cuántos cobros le
 * quedan antes de que registrarse sea obligatorio. Mientras llega la primera lectura (o
 * si el comercio aún no se registró) el nombre es el de ejemplo y no hay usuario.
 */
export function usePerfil() {
  const { data } = usePolling<Perfil>("/api/perfil", 15_000);
  return {
    usuario: data?.usuario,
    comercio: data?.comercio ?? COMERCIO_EJEMPLO,
    registrado: data?.registrado ?? false,
    restantes: data ? cobrosRestantes(data) : null,
    cargado: data !== null,
    /** Desde cuándo existe el comercio (para no ofrecer certificados de antes). */
    creadoEn: data?.creadoEn,
  };
}
