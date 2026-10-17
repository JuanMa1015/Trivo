"use client";

import { useEffect, useState } from "react";
import { IconRayo } from "@/components/icons";
import { Icono3D } from "@/components/web/icono-3d";

/** Cada tip se queda este tiempo antes de pasar al siguiente. */
const TIP_MS = 6000;

export type Tip = { titulo?: string; texto: string };

/**
 * Consejos uno a la vez, sobre tinta. Pasan solos; se pausan mientras el mouse o el
 * foco están encima, y los puntos permiten elegir uno.
 */
export function CarruselTips({
  titulo = "Tip",
  tips,
  className = "",
}: {
  titulo?: string;
  tips: readonly Tip[];
  className?: string;
}) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const tip = tips[actual] ?? tips[0];

  useEffect(() => {
    if (pausado) return;
    const id = setTimeout(
      () => setActual((a) => (a + 1) % tips.length),
      TIP_MS,
    );
    return () => clearTimeout(id);
  }, [actual, pausado, tips.length]);

  return (
    <section
      className={`web-subir flex items-start gap-5 rounded-web bg-tinta px-6 py-5 text-white shadow-tarjeta ${className}`}
      aria-labelledby="tip-titulo"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <Icono3D Icono={IconRayo} tono="agua" tamano={52} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="tip-titulo" className="text-web-sm font-bold text-aqua">
          {titulo}
        </h2>
        {/* Solo se anuncia cuando la persona elige un tip, no en cada cambio automático. */}
        <p
          key={actual}
          className="web-aparecer text-web-sm"
          aria-live={pausado ? "polite" : "off"}
        >
          {tip.titulo ? <strong>{tip.titulo}. </strong> : null}
          {tip.texto}
        </p>
        <div className="-ml-2.5 flex flex-wrap">
          {tips.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`${titulo} ${i + 1} de ${tips.length}`}
              aria-current={i === actual ? "true" : undefined}
              className="grid size-8 place-items-center rounded-full transition-colors duration-200 hover:bg-white/10"
            >
              {i === actual ? (
                // El tip actual se muestra como una barra que se llena hasta el siguiente.
                <span className="h-2 w-6 overflow-hidden rounded-full bg-white/25">
                  <span
                    key={actual}
                    className="tip-progreso block h-full rounded-full bg-aqua"
                    style={{
                      animationDuration: `${TIP_MS}ms`,
                      animationPlayState: pausado ? "paused" : "running",
                    }}
                  />
                </span>
              ) : (
                <span className="size-2 rounded-full bg-white/30" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
