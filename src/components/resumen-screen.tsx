"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  IconDocumento,
  IconGrafico,
  IconRayo,
  IconReloj,
  IconWallet,
} from "@/components/icons";
import { GraficoPuntos } from "@/components/resumen/grafico-puntos";
import {
  DIAS,
  DIAS_CORTOS,
  calcularResumen,
  type Resumen,
} from "@/components/resumen/calcular-resumen";
import {
  AvisoWeb,
  DosColumnasWeb,
  EncabezadoTarjeta,
  PantallaWeb,
} from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { Icono3D, type Tono3D } from "@/components/web/icono-3d";
import { NavComercio } from "@/components/web/nav-web";
import type { CobroResumen } from "@/lib/cobros";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import { useAhora, usePolling } from "@/lib/use-polling";
import { SoloMovil } from "@/components/web/vista";

const TIPS = [
  "Registra cada venta, aunque sea pequeña. Así descubres tu mejor día.",
  "Si le cobras a un turista, él ve su moneda y tú recibes pesos.",
  "Si un cobro vence, crea uno nuevo. No pierdes nada.",
];

/**
 * Resumen (/resumen): cómo van las ventas de la semana y de hoy. Se calcula en el
 * navegador con la misma lectura del talonario (GET /api/cobros cada 3 s), que trae
 * los últimos 100 cobros.
 */
export function ResumenScreen() {
  const { data, estado } = usePolling<{ cobros: CobroResumen[] }>(
    "/api/cobros",
    3000,
  );
  const ahora = useAhora(60_000);
  const cobros = data?.cobros ?? [];
  const listo = data !== null;
  const r = calcularResumen(cobros, new Date(ahora));
  /** Mientras llega la primera lectura no se muestran ceros falsos. */
  const cifra = (texto: string) => (listo ? texto : "…");

  const aviso =
    estado === "error" ? (
      listo ? (
        <AvisoWeb>Sin conexión. Mostramos tus últimos datos.</AvisoWeb>
      ) : (
        <AvisoWeb tono="error">
          No pudimos cargar tu resumen. Reintentando…
        </AvisoWeb>
      )
    ) : null;

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-10 pt-4 font-[family-name:var(--font-web)] lg:hidden">
          <header className="flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-primary">
              Trivo
            </span>
            <span className="text-sm text-secondary/70">
              {COMERCIO_EJEMPLO}
            </span>
          </header>
          {aviso}
          <Semana r={r} listo={listo} cifra={cifra} />
          <Datos r={r} cifra={cifra} />
          <Tips />
        </main>
      </SoloMovil>

      <PantallaWeb
        nav={<NavComercio seccion="resumen" comercio={COMERCIO_EJEMPLO} />}
        hero={
          <HeroWeb
            insignia="Resumen"
            IconoInsignia={IconGrafico}
            titulo="Así va tu semana"
            subtitulo="Cada cobro suma a tu historial de ventas."
            comercio={COMERCIO_EJEMPLO}
            tarjeta={{
              rotulo: "Esta semana",
              valor: cifra(pesosWeb(r.semana.total)),
            }}
          />
        }
      >
        {aviso}
        <DosColumnasWeb>
          <div className="flex min-h-0 flex-col gap-(--separacion)">
            <Semana r={r} listo={listo} cifra={cifra} />
            <Tips />
          </div>
          <Datos r={r} cifra={cifra} />
        </DosColumnasWeb>
      </PantallaWeb>
    </>
  );
}

type Cifra = (texto: string) => string;

/** La semana por día, con el mejor día resaltado. */
function Semana({
  r,
  listo,
  cifra,
}: {
  r: Resumen;
  listo: boolean;
  cifra: Cifra;
}) {
  const totales = r.semana.dias.map((d) => d.total);
  const descripcion = totales
    .map((t, i) => `${DIAS[i]} ${pesosWeb(t)}`)
    .join(", ");

  return (
    <section className="tarjeta-web web-escalonado flex flex-1 flex-col gap-4 p-6">
      <EncabezadoTarjeta
        icono={<IconGrafico width={24} height={24} />}
        titulo="Esta semana"
        subtitulo={cifra(
          `${r.semana.cobros} cobros · hoy ${pesosWeb(r.hoy.total)}`,
        )}
      />
      <figure
        className="flex min-h-0 flex-1 flex-col gap-3"
        role="img"
        aria-label={`Cobrado por día: ${descripcion}`}
      >
        <div className="min-h-24 flex-1">
          <GraficoPuntos
            valores={totales}
            resaltado={r.mejorDia}
            maxPuntos={10}
            grande
          />
        </div>
        <figcaption
          className="grid grid-cols-7 text-center text-web-xs"
          aria-hidden="true"
        >
          {DIAS_CORTOS.map((dia, i) => (
            <span
              key={dia}
              className={
                i === r.indiceHoy ? "font-bold text-primary" : "text-ink/60"
              }
            >
              {dia}
            </span>
          ))}
        </figcaption>
      </figure>
      {listo && r.semana.cobros === 0 ? (
        <p className="text-web-sm text-ink/60">
          Aún no hay datos. Cobra tu primer comprobante.
        </p>
      ) : null}
    </section>
  );
}

/** Cuatro datos en 2x2: hoy, mejor día, cobros y promedio por cobro. */
function Datos({ r, cifra }: { r: Resumen; cifra: Cifra }) {
  const totales = r.semana.dias.map((d) => d.total);
  const conteos = r.semana.dias.map((d) => d.cobros);
  const promedios = r.semana.dias.map((d) =>
    d.cobros > 0 ? d.total / d.cobros : 0,
  );

  return (
    <div className="web-escalonado grid grid-cols-2 grid-rows-2 gap-(--separacion)">
      <Dato
        Icono={IconReloj}
        tono="primario"
        etiqueta="Hoy"
        valor={cifra(pesosWeb(r.hoy.total))}
        grafico={<GraficoPuntos valores={totales} resaltado={r.indiceHoy} />}
      />
      <Dato
        Icono={IconRayo}
        tono="cielo"
        etiqueta="Mejor día"
        valor={cifra(r.mejorDia === null ? "—" : DIAS[r.mejorDia])}
        grafico={<GraficoPuntos valores={totales} resaltado={r.mejorDia} />}
        destacado
      />
      <Dato
        Icono={IconDocumento}
        tono="agua"
        etiqueta="Cobros"
        valor={cifra(String(r.semana.cobros))}
        grafico={<GraficoPuntos valores={conteos} resaltado={r.indiceHoy} />}
      />
      <Dato
        Icono={IconWallet}
        tono="tinta"
        etiqueta="Promedio por cobro"
        valor={cifra(pesosWeb(r.promedio))}
        grafico={<GraficoPuntos valores={promedios} resaltado={r.indiceHoy} />}
      />
    </div>
  );
}

function Dato({
  Icono,
  tono,
  etiqueta,
  valor,
  grafico,
  destacado = false,
}: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  tono: Tono3D;
  etiqueta: string;
  valor: string;
  grafico: ReactNode;
  /** El mejor día va sobre agua, como el hero. */
  destacado?: boolean;
}) {
  return (
    <section
      className={`contenedor-cifra flex flex-col justify-between gap-3 rounded-web p-6 shadow-tarjeta ${
        destacado ? "hero-mini" : "bg-papel"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <Icono3D Icono={Icono} tono={tono} tamano={52} />
        {grafico}
      </div>
      <div>
        <h2 className="text-web-sm text-ink/60">{etiqueta}</h2>
        <p className="cifra-web text-tinta">{valor}</p>
      </div>
    </section>
  );
}

/** Cada tip se queda este tiempo antes de pasar al siguiente. */
const TIP_MS = 6000;

/**
 * Consejos para el vendedor, uno a la vez. Pasan solos; se pausan mientras el
 * mouse o el foco están encima, y los puntos permiten elegir uno.
 */
function Tips() {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const id = setTimeout(
      () => setActual((a) => (a + 1) % TIPS.length),
      TIP_MS,
    );
    return () => clearTimeout(id);
  }, [actual, pausado]);

  return (
    <section
      className="web-subir flex items-center gap-6 rounded-web bg-tinta px-6 py-5 text-white shadow-tarjeta"
      aria-labelledby="tip-titulo"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <Icono3D Icono={IconRayo} tono="agua" tamano={52} />
      <div className="min-w-0 flex-1">
        <h2 id="tip-titulo" className="text-web-sm font-bold text-aqua">
          Tip
        </h2>
        {/* Solo se anuncia cuando la persona elige un tip, no en cada cambio automático. */}
        <p
          key={actual}
          className="web-aparecer text-web-sm"
          aria-live={pausado ? "polite" : "off"}
        >
          {TIPS[actual]}
        </p>
      </div>
      <div className="flex">
        {TIPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActual(i)}
            aria-label={`Tip ${i + 1} de ${TIPS.length}`}
            aria-current={i === actual ? "true" : undefined}
            className="grid size-9 place-items-center rounded-full transition-colors duration-200 hover:bg-white/10"
          >
            {i === actual ? (
              // El tip actual se muestra como una barra que se llena hasta el siguiente.
              <span className="h-2.5 w-6 overflow-hidden rounded-full bg-white/25">
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
              <span className="size-2.5 rounded-full bg-white/30" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
