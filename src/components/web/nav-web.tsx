"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  IconDocumento,
  IconEscudo,
  IconGrafico,
  IconWallet,
} from "@/components/icons";
import { LangToggle } from "@/components/lang-toggle";
import { MenuComercio, PildoraRegistro } from "@/components/menu-comercio";
import { Icono3D } from "@/components/web/icono-3d";
import { LogoTrivo } from "@/components/web/marca";
import type { Lang } from "@/lib/i18n";
import { usePerfil } from "@/lib/use-perfil";

export type SeccionWeb = "cobrar" | "talonario" | "resumen" | "impuestos";

export const SECCIONES: {
  id: SeccionWeb;
  href: string;
  texto: string;
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { id: "cobrar", href: "/", texto: "Cobrar", Icono: IconWallet },
  {
    id: "talonario",
    href: "/talonario",
    texto: "Talonario",
    Icono: IconDocumento,
  },
  { id: "resumen", href: "/resumen", texto: "Resumen", Icono: IconGrafico },
  {
    id: "impuestos",
    href: "/impuestos",
    texto: "Impuestos",
    Icono: IconEscudo,
  },
];

function Barra({ children }: { children: ReactNode }) {
  return (
    <header className="nav-web relative z-30 flex h-16 items-center gap-3 px-4 lg:px-6 xl:gap-6">
      {children}
    </header>
  );
}

/**
 * Barra del comercio: marca, secciones y la cuenta (usuario junto a su avatar). El
 * comercio va en el banner, junto a la ubicación.
 */
export function NavComercio({ seccion }: { seccion: SeccionWeb }) {
  const { usuario, comercio, registrado, restantes, cargado } = usePerfil();
  return (
    <>
      <Barra>
        <LogoTrivo />
        <nav aria-label="Secciones" className="hidden flex-1 lg:block">
          <ul className="flex gap-2">
            {SECCIONES.map(({ id, href, texto, Icono }) => {
              const activa = id === seccion;
              return (
                <li key={id}>
                  <Link
                    href={href}
                    aria-current={activa ? "page" : undefined}
                    className={`flex h-11 items-center gap-2 rounded-full text-web-sm transition-colors duration-200 ${
                      activa
                        ? "bg-aqua/30 pl-1.5 pr-3 font-bold text-primary xl:pr-5"
                        : "px-3 text-ink/70 hover:bg-aqua/10 hover:text-tinta xl:px-5"
                    }`}
                  >
                    {activa ? (
                      <Icono3D Icono={Icono} tamano={30} />
                    ) : (
                      <Icono
                        width={20}
                        height={20}
                        className="hidden xl:block"
                      />
                    )}
                    {texto}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3 lg:ml-0">
          {/* En el celular el recordatorio es la franja de arriba. */}
          {cargado && !registrado && restantes !== null ? (
            <span className="hidden lg:block">
              <PildoraRegistro restantes={restantes} />
            </span>
          ) : null}
          <MenuComercio
            usuario={usuario}
            comercio={comercio}
            registrado={registrado}
          />
        </div>
      </Barra>

      {/* Celular: las secciones van abajo, al alcance del pulgar. */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-3 bottom-3 z-40 rounded-3xl bg-white p-1.5 shadow-tarjeta ring-1 ring-ink/5 lg:hidden"
      >
        <ul className="grid grid-cols-4 gap-1">
          {SECCIONES.map(({ id, href, texto, Icono }) => {
            const activa = id === seccion;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={activa ? "page" : undefined}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors duration-200 ${
                    activa ? "bg-aqua/30 text-primary" : "text-ink/70"
                  }`}
                >
                  {activa ? (
                    <Icono3D Icono={Icono} tamano={28} />
                  ) : (
                    <Icono width={22} height={22} />
                  )}
                  {texto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Barra del pagador: marca y el selector de idioma. */
export function NavPagador({
  lang,
  onLang,
}: {
  lang: Lang;
  onLang: (lang: Lang) => void;
}) {
  return (
    <Barra>
      <span className="flex-1">
        <LogoTrivo />
      </span>
      <LangToggle lang={lang} onChange={onLang} />
    </Barra>
  );
}
