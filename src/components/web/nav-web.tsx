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
import { Icono3D } from "@/components/web/icono-3d";
import { LogoTrivo } from "@/components/web/marca";
import type { Lang } from "@/lib/i18n";
import { usePerfil } from "@/lib/use-perfil";

export type SeccionWeb = "cobrar" | "talonario" | "resumen" | "impuestos";

const SECCIONES: {
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

/** Iniciales del comercio para su avatar ("Almacén El Centro" → "AC"). */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Barra({ children }: { children: ReactNode }) {
  return (
    <header className="nav-web flex h-16 items-center gap-3 px-4 lg:px-6 xl:gap-6">
      {children}
    </header>
  );
}

/** Barra del comercio: marca, secciones e identidad del comercio. */
export function NavComercio({ seccion }: { seccion: SeccionWeb }) {
  const { usuario, comercio } = usePerfil();
  return (
    <>
      <Barra>
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <LogoTrivo />
          {usuario ? (
            <span
              className="max-w-24 truncate border-l border-ink/15 pl-3 text-web-xs font-semibold text-tinta sm:max-w-40 sm:text-web-sm lg:max-w-28 lg:pl-4 xl:max-w-40"
              title={usuario}
            >
              {usuario}
            </span>
          ) : null}
        </div>
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
                        : "px-3 text-ink/60 hover:bg-aqua/10 hover:text-tinta xl:px-5"
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
          <span
            className="max-w-28 truncate text-web-xs font-semibold text-tinta sm:max-w-44 sm:text-web-sm xl:max-w-72"
            title={comercio}
          >
            {comercio}
          </span>
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-web-xs font-bold text-white"
            aria-hidden="true"
          >
            {iniciales(comercio)}
          </span>
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
                    activa ? "bg-aqua/30 text-primary" : "text-ink/60"
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
