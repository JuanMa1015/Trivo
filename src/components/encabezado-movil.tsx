"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePerfil } from "@/lib/use-perfil";

/** Encabezado móvil del vendedor: el usuario a la izquierda (o la marca si aún no se registra) y el comercio a la derecha. */
export function EncabezadoMovil({ children }: { children?: ReactNode }) {
  const { usuario, comercio } = usePerfil();
  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href="/"
        className="min-w-0 truncate text-xl font-bold tracking-tight text-primary"
      >
        {usuario ?? "Trivo"}
      </Link>
      <span className="flex min-w-0 items-center gap-3 text-sm text-secondary/70">
        <span className="truncate">{comercio}</span>
        {children}
      </span>
    </header>
  );
}
