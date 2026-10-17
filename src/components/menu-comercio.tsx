"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconChevron,
  IconSalir,
  IconUbicacion,
  IconUsuario,
} from "@/components/icons";

/** Iniciales para el avatar ("Almacén El Centro" → "AC", "samuel" → "S"). */
export function iniciales(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  const largas = palabras.filter((p) => p.length > 2);
  return (largas.length > 0 ? largas : palabras)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * La cuenta del vendedor: su nombre de usuario al lado de su avatar (el comercio va en
 * el banner, junto a la ubicación). Abre un menú con el comercio, crear cuenta si aún no
 * la tiene y salir. Salir borra la sesión (DELETE /api/acceso) y recarga: si el comercio
 * usa clave, vuelve a pedirla, y la recarga descarta las pantallas guardadas en memoria.
 */
export function MenuComercio({
  usuario,
  comercio,
  registrado,
  compacto = false,
}: {
  usuario?: string;
  comercio: string;
  registrado: boolean;
  /** Móvil: avatar pequeño. */
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  async function salir() {
    if (saliendo) return;
    setSaliendo(true);
    setError(false);
    try {
      const r = await fetch("/api/acceso", { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      window.location.replace("/");
    } catch {
      setError(true);
      setSaliendo(false);
    }
  }

  const tamano = compacto ? "size-8 text-xs" : "size-10 text-web-xs";

  return (
    <div ref={caja} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={`Tu cuenta: ${usuario ?? "sin cuenta"}`}
        className={`flex min-w-0 items-center rounded-full transition-colors duration-200 hover:bg-aqua/10 ${
          compacto ? "h-11 gap-2 pl-3 pr-1" : "h-11 gap-3 py-1 pl-4 pr-1"
        }`}
      >
        {usuario ? (
          <span
            className={`truncate font-semibold text-tinta ${
              compacto ? "max-w-36 text-sm" : "max-w-44 text-web-sm xl:max-w-72"
            }`}
          >
            {usuario}
          </span>
        ) : null}
        {compacto ? (
          <IconChevron
            width={16}
            height={16}
            className="shrink-0 text-ink/70"
          />
        ) : null}
        <span
          className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${tamano} ${
            usuario ? "bg-primary" : "bg-ink/40"
          }`}
          aria-hidden="true"
        >
          {usuario ? (
            iniciales(usuario)
          ) : (
            <IconUsuario width={18} height={18} />
          )}
        </span>
      </button>
      {abierto ? (
        <div
          role="menu"
          className="web-aparecer absolute right-0 top-full z-40 mt-2 flex w-64 flex-col gap-1 rounded-2xl bg-white p-2 shadow-tarjeta ring-1 ring-ink/8"
        >
          <p className="flex items-center gap-2 px-3 py-2 text-sm text-ink/70 lg:text-web-sm">
            <IconUbicacion width={18} height={18} className="shrink-0" />
            <span className="truncate">{comercio}</span>
          </p>
          {registrado ? null : (
            <Link
              href="/registro"
              role="menuitem"
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-primary hover:bg-aqua/10 lg:text-web-sm"
            >
              <IconUsuario width={20} height={20} />
              Crear cuenta
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={salir}
            disabled={saliendo}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-tinta hover:bg-aqua/10 disabled:opacity-60 lg:text-web-sm"
          >
            <IconSalir width={20} height={20} />
            {saliendo ? "Saliendo…" : "Salir"}
          </button>
          {error ? (
            <p role="alert" className="px-3 pb-2 text-sm text-error">
              No pudimos salir. Revisa tu conexión.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Recordatorio de registro dentro de la barra de escritorio (en móvil es la franja de
 * arriba). Así no empuja la pantalla hacia abajo.
 */
export function PildoraRegistro({ restantes }: { restantes: number }) {
  const ultimo = restantes === 0;
  return (
    <Link
      href={ultimo ? "/registro?obligatorio=1" : "/registro"}
      role={ultimo ? "alert" : undefined}
      className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-web-sm font-bold transition-colors duration-200 ${
        ultimo
          ? "bg-error/10 text-error hover:bg-error/15"
          : "bg-aqua/25 text-primary hover:bg-aqua/35"
      }`}
    >
      <IconUsuario width={18} height={18} />
      {ultimo
        ? "Crea tu cuenta para seguir cobrando"
        : `Crea tu cuenta · te ${restantes === 1 ? "queda 1 cobro" : `quedan ${restantes} cobros`}`}
    </Link>
  );
}
