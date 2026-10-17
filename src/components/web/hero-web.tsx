import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";
import { IconUbicacion } from "@/components/icons";
import { Icono3D } from "@/components/web/icono-3d";
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
    <section className="hero-web flex flex-col items-stretch gap-4 px-4 py-4 lg:flex-row lg:items-center lg:gap-8 lg:px-12 lg:py-0">
      <MarcasHero />

      <div className="relative flex min-w-0 flex-1 flex-col items-start gap-2">
        <span className="hero-insignia flex h-9 items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3 text-web-xs font-semibold text-primary">
          <Icono3D Icono={IconoInsignia} tamano={28} />
          {insignia}
        </span>
        <h1 className="hero-titulo max-w-xl text-2xl font-extrabold text-tinta lg:text-titulo">
          {titulo}
        </h1>
        {subtitulo ? (
          <p className="hero-subtitulo max-w-xl line-clamp-2 text-web-xs text-tinta/70 lg:truncate lg:text-web-sm">
            {subtitulo}
          </p>
        ) : null}
      </div>

      {comercio ? (
        <p className="relative hidden items-center gap-2 self-end pb-8 text-web-sm font-semibold text-tinta lg:flex">
          <Icono3D Icono={IconUbicacion} tono="cielo" tamano={32} />
          {comercio}
        </p>
      ) : null}

      {tarjeta ? (
        <div className="hero-tarjeta cristal-web relative flex w-full shrink-0 items-end justify-between gap-4 px-4 py-3 lg:w-80 lg:px-6 lg:py-5 2xl:w-96">
          {/* La cifra se achica según su largo: un monto grande nunca se corta. */}
          <div className="contenedor-cifra min-w-0 flex-1">
            {tarjeta.rotulo ? (
              <p className="text-web-xs text-tinta/70">{tarjeta.rotulo}</p>
            ) : null}
            <p
              className="cifra-ajustable font-extrabold text-tinta"
              style={{ "--caracteres": tarjeta.valor.length } as CSSProperties}
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
