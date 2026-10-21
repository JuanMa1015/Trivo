"use client";

import { COMERCIO_INVITADO, cobrosRestantes, type Perfil } from "@/lib/perfil";
import { usePolling } from "@/lib/use-polling";

/**
 * Usuario y nombre del comercio para las pantallas del vendedor, y cuántos cobros le
 * quedan antes de que registrarse sea obligatorio. Mientras llega la primera lectura (o
 * si es un invitado) el nombre es genérico y no hay usuario.
 */
export function usePerfil() {
  const { data } = usePolling<Perfil>("/api/perfil", 15_000);
  return {
    usuario: data?.usuario,
    comercio: data?.comercio ?? COMERCIO_INVITADO,
    registrado: data?.registrado ?? false,
    restantes: data ? cobrosRestantes(data) : null,
    cargado: data !== null,
  };
}
