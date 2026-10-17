"use client";

import { useState } from "react";
import {
  IconDescargar,
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
import { CarruselTips } from "@/components/web/carrusel-tips";
import { Icono3D } from "@/components/web/icono-3d";
import { Selector } from "@/components/web/selector";
import { TarjetaDato } from "@/components/web/tarjeta-dato";
import { NavComercio } from "@/components/web/nav-web";
import type { CobroResumen } from "@/lib/cobros";
import { hoyEnColombia, mesAnterior, nombreDelPeriodo } from "@/lib/impuestos";
import { usePerfil } from "@/lib/use-perfil";
import { useAhora, usePolling } from "@/lib/use-polling";

const TIPS = [
  {
    texto:
      "Registra cada venta, aunque sea pequeña. Así descubres tu mejor día.",
  },
  { texto: "Si le cobras a un turista, él ve su moneda y tú recibes pesos." },
  { texto: "Si un cobro vence, crea uno nuevo. No pierdes nada." },
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
  const { comercio } = usePerfil();
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
      <PantallaWeb
        nav={<NavComercio seccion="resumen" />}
        hero={
          <HeroWeb
            insignia="Resumen"
            IconoInsignia={IconGrafico}
            titulo="Así va tu semana"
            subtitulo="Cada cobro suma a tu historial de ventas."
            comercio={comercio}
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
            <CarruselTips tips={TIPS} />
          </div>
          <div className="flex min-h-0 flex-col gap-(--separacion)">
            <Datos r={r} cifra={cifra} />
            <Certificado ahora={ahora} />
          </div>
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
                i === r.indiceHoy ? "font-bold text-primary" : "text-ink/70"
              }
            >
              {dia}
            </span>
          ))}
        </figcaption>
      </figure>
      {listo && r.semana.cobros === 0 ? (
        <p className="text-web-sm text-ink/70">
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
    <div className="web-escalonado grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-(--separacion)">
      <TarjetaDato
        Icono={IconReloj}
        tono="primario"
        etiqueta="Hoy"
        valor={cifra(pesosWeb(r.hoy.total))}
        esquina={<GraficoPuntos valores={totales} resaltado={r.indiceHoy} />}
      />
      <TarjetaDato
        Icono={IconRayo}
        tono="cielo"
        etiqueta="Mejor día"
        valor={cifra(r.mejorDia === null ? "—" : DIAS[r.mejorDia])}
        esquina={<GraficoPuntos valores={totales} resaltado={r.mejorDia} />}
        destacado
      />
      <TarjetaDato
        Icono={IconDocumento}
        tono="agua"
        etiqueta="Cobros"
        valor={cifra(String(r.semana.cobros))}
        esquina={<GraficoPuntos valores={conteos} resaltado={r.indiceHoy} />}
      />
      <TarjetaDato
        Icono={IconWallet}
        tono="tinta"
        etiqueta="Promedio por cobro"
        valor={cifra(pesosWeb(r.promedio))}
        esquina={<GraficoPuntos valores={promedios} resaltado={r.indiceHoy} />}
      />
    </div>
  );
}

/** Certificado de ventas de un mes, con código y QR para que otro lo verifique. */
function Certificado({ ahora }: { ahora: number }) {
  const actual = hoyEnColombia(ahora).slice(0, 7);
  const meses = Array.from({ length: 6 }, (_, i) => mesAnterior(actual, i));
  const [mes, setMes] = useState(actual);

  return (
    <section className="tarjeta-web web-escalonado flex flex-col gap-4 p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center 2xl:p-6">
      <div className="flex min-w-0 items-center gap-4">
        <Icono3D Icono={IconDocumento} tono="primario" tamano={48} />
        <div className="min-w-0">
          <h2 className="font-bold text-tinta lg:text-cuerpo">
            Certificado de ventas
          </h2>
          <p className="truncate text-web-xs text-ink/70">
            Verificable con código y QR.
          </p>
        </div>
      </div>
      <Selector
        etiqueta="Mes del certificado"
        valor={mes}
        onCambio={setMes}
        opciones={meses.map((m) => ({
          valor: m,
          texto: nombreDelPeriodo(m),
        }))}
      />
      <a
        href={`/api/certificado?mes=${mes}`}
        download
        className="boton-web whitespace-nowrap lg:w-auto lg:px-6"
      >
        <IconDescargar width={20} height={20} />
        Descargar PDF
      </a>
    </section>
  );
}
