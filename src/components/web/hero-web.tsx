import type { ComponentType, ReactNode, SVGProps } from "react";
import { IconUbicacion } from "@/components/icons";
import { MarcasHero } from "@/components/web/marca";

/**
 * Hero de escritorio: degradado de agua con marcas "T", insignia de la sección,
 * título, subtítulo, el comercio y una tarjeta de cristal con la cifra principal.
 * Es el mismo en todas las secciones; al navegar solo cambian sus textos.
 */
export function HeroWeb({
  insignia,
  IconoInsignia,
  titulo,
  subtitulo,
  comercio,
  tarjeta,
}: {
  insignia: string;
  IconoInsignia: ComponentType<SVGProps<SVGSVGElement>>;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  comercio?: string;
  /** Cifra principal: rótulo, valor y, si aplica, una acción (botón circular). */
  tarjeta?: {
    rotulo?: string;
    valor: string;
    enVivo?: boolean;
    accion?: ReactNode;
  };
}) {
  return (
    <section className="hero-web flex items-center gap-8 px-12">
      <MarcasHero />

      <div className="relative flex min-w-0 flex-1 flex-col items-start gap-2">
        <span className="hero-insignia flex h-8 items-center gap-2 rounded-full bg-white/60 px-3 text-web-xs font-semibold text-primary">
          <IconoInsignia width={16} height={16} />
          {insignia}
        </span>
        <h1 className="hero-titulo max-w-xl text-titulo font-extrabold text-tinta">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="hero-subtitulo max-w-xl truncate text-web-sm text-tinta/70">
            {subtitulo}
          </p>
        ) : null}
      </div>

      {comercio ? (
        <p className="relative flex items-start gap-2 self-end pb-8 text-web-sm font-semibold text-tinta">
          <IconUbicacion width={20} height={20} className="text-primary" />
          {comercio}
        </p>
      ) : null}

      {tarjeta ? (
        <div className="hero-tarjeta cristal-web relative flex w-72 shrink-0 items-end justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            {tarjeta.rotulo ? (
              <p className="text-web-xs text-tinta/70">{tarjeta.rotulo}</p>
            ) : null}
            <p
              className="truncate text-titulo font-extrabold text-tinta"
              aria-live={tarjeta.enVivo ? "polite" : undefined}
            >
              {tarjeta.valor}
            </p>
          </div>
          {tarjeta.accion}
        </div>
      ) : null}
    </section>
  );
}
