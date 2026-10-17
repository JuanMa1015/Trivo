"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconUbicacion } from "@/components/icons";
import { MenuComercio } from "@/components/menu-comercio";
import { LogoTrivo } from "@/components/web/marca";
import { usePerfil } from "@/lib/use-perfil";

/**
 * Encabezado móvil del vendedor: el logo a la izquierda y la cuenta a la derecha (el
 * usuario junto a su avatar, con el menú para salir); debajo, el comercio con su
 * ubicación, como en el banner de escritorio.
 */
export function EncabezadoMovil({ children }: { children?: ReactNode }) {
  const { usuario, comercio, registrado } = usePerfil();
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="min-w-0 truncate text-xl font-bold tracking-tight text-primary"
        >
          <LogoTrivo tamano={20} />
        </Link>
        <span className="flex min-w-0 items-center gap-3 text-sm text-secondary/70">
          <MenuComercio
            usuario={usuario}
            comercio={comercio}
            registrado={registrado}
            compacto
          />
          {children}
        </span>
      </div>
      {/* El comercio va junto a la ubicación, como en el banner de escritorio. */}
      <p className="flex items-center gap-1.5 text-sm text-secondary/70">
        <IconUbicacion
          width={16}
          height={16}
          className="shrink-0 text-primary"
        />
        <span className="truncate">{comercio}</span>
      </p>
    </header>
  );
}
