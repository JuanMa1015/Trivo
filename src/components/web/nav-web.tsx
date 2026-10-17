import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { IconDocumento, IconGrafico, IconWallet } from "@/components/icons";
import { LangToggle } from "@/components/lang-toggle";
import { Icono3D } from "@/components/web/icono-3d";
import { LogoTrivo } from "@/components/web/marca";
import type { Lang } from "@/lib/i18n";

export type SeccionWeb = "cobrar" | "talonario" | "resumen";

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
    <header className="nav-web flex h-16 items-center gap-10 px-6">
      {children}
    </header>
  );
}

/** Barra del comercio: marca, secciones e identidad del comercio. */
export function NavComercio({
  seccion,
  comercio,
}: {
  seccion: SeccionWeb;
  comercio: string;
}) {
  return (
    <Barra>
      <LogoTrivo />
      <nav aria-label="Secciones" className="flex-1">
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
                      ? "bg-aqua/30 pl-1.5 pr-5 font-bold text-primary"
                      : "px-5 text-ink/60 hover:bg-aqua/10 hover:text-tinta"
                  }`}
                >
                  {activa ? (
                    <Icono3D Icono={Icono} tamano={30} />
                  ) : (
                    <Icono width={20} height={20} />
                  )}
                  {texto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-web-sm font-semibold text-tinta">{comercio}</span>
        <span
          className="grid size-10 place-items-center rounded-full bg-primary text-web-xs font-bold text-white"
          aria-hidden="true"
        >
          {iniciales(comercio)}
        </span>
      </div>
    </Barra>
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
