"use client";

import { EncabezadoMovil } from "@/components/encabezado-movil";
import { NavMovil } from "@/components/nav-movil";
import { useState, useSyncExternalStore } from "react";
import {
  IconDocumento,
  IconEscudo,
  IconGrafico,
  IconReloj,
} from "@/components/icons";
import { CarruselTips } from "@/components/web/carrusel-tips";
import { AvisoWeb, PantallaWeb } from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import type { Tono3D } from "@/components/web/icono-3d";
import { NavComercio } from "@/components/web/nav-web";
import { Selector } from "@/components/web/selector";
import { TarjetaDato } from "@/components/web/tarjeta-dato";
import { SoloMovil } from "@/components/web/vista";
import {
  ANIO_GRAVABLE_A_DECLARAR,
  ANIO_GRAVABLE_EN_CURSO,
  CONSEJOS,
  NO_EXIME,
  avancesDelAnio,
  estadoPlazo,
  hoyEnColombia,
  mesesDeRetraso,
  multaExtemporanea,
  multaPorNoDeclarar,
  plazoRenta,
  type AvanceTope,
} from "@/lib/impuestos";
import { AVISO_TRIBUTARIO, type Nivel } from "@/lib/topes";
import { usePerfil } from "@/lib/use-perfil";
import { useAhora, usePolling } from "@/lib/use-polling";

const CLAVE_DOCUMENTO = "trivo.documento";

const NIVEL: Record<Nivel, { barra: string; texto: string; etiqueta: string }> =
  {
    ok: { barra: "bg-primary", texto: "text-primary", etiqueta: "Vas bien" },
    atencion: {
      barra: "bg-atencion",
      texto: "text-atencion",
      etiqueta: "Te acercas",
    },
    critico: {
      barra: "bg-critico",
      texto: "text-critico",
      etiqueta: "Muy cerca",
    },
    superado: {
      barra: "bg-critico",
      texto: "text-critico",
      etiqueta: "Tope superado",
    },
  };

/** Lo que pasa al acercarse o pasar cada tope, en una línea. */
const SI_SUPERAS: Record<string, string> = {
  "renta-ingresos": `Tendrás que declarar renta de ${ANIO_GRAVABLE_EN_CURSO}.`,
  facturacion: "Tendrás que facturar electrónicamente.",
};

/** Ícono, tono y nombre corto de cada tope. */
const TOPE: Record<
  string,
  { Icono: typeof IconDocumento; tono: Tono3D; nombre: string }
> = {
  facturacion: {
    Icono: IconDocumento,
    tono: "primario",
    nombre: "Tope para facturar",
  },
  "renta-ingresos": {
    Icono: IconGrafico,
    tono: "cielo",
    nombre: "Tope para declarar renta",
  },
};

const TRAZO: Record<Nivel, string> = {
  ok: "stroke-primary",
  atencion: "stroke-atencion",
  critico: "stroke-critico",
  superado: "stroke-critico",
};

const MESES = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  return {
    valor: String(n),
    texto: `${n} ${n === 1 ? "mes" : "meses"}${n === 12 ? " o más" : ""}`,
  };
});

/** Lo que debes saber, uno a la vez. */
const TIPS = [{ titulo: "Ojo", texto: NO_EXIME }, ...CONSEJOS];

const soloDigitos = (texto: string, largo: number) =>
  texto.replace(/\D/g, "").slice(0, largo);

/**
 * Los dos últimos dígitos del documento se guardan solo en este navegador. Se lee con
 * `useSyncExternalStore` para que el servidor y el primer dibujo coincidan (vacío) y
 * después aparezca lo guardado; sin almacenamiento disponible, vive en memoria.
 */
const oyentes = new Set<() => void>();
let enMemoria = "";

function leerDocumento(): string {
  try {
    return soloDigitos(localStorage.getItem(CLAVE_DOCUMENTO) ?? "", 2);
  } catch {
    return enMemoria;
  }
}

function suscribirDocumento(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function useDocumento(): [string, (v: string) => void] {
  const valor = useSyncExternalStore(
    suscribirDocumento,
    leerDocumento,
    () => "",
  );
  return [
    valor,
    (v) => {
      enMemoria = v;
      try {
        localStorage.setItem(CLAVE_DOCUMENTO, v);
      } catch {
        // Sin almacenamiento: queda en memoria.
      }
      oyentes.forEach((avisar) => avisar());
    },
  ];
}

/**
 * Impuestos (/impuestos): cuánto va del año frente a los topes de la DIAN, la fecha para
 * declarar y cuánto cuesta hacerlo tarde. Una tarjeta por dato, con lo justo; el resto
 * pasa en los consejos. Informativo, no asesoría.
 */
export function ImpuestosScreen() {
  const { data, estado } = usePolling<{ anio: number; ingresos: number }>(
    "/api/impuestos",
    10_000,
  );
  const ahora = useAhora(60_000);
  const { comercio } = usePerfil();
  const listo = data !== null;
  const ingresos = data?.ingresos ?? 0;
  const avances = avancesDelAnio(ingresos);

  const aviso =
    estado === "error" ? (
      listo ? (
        <AvisoWeb>Sin conexión. Mostramos tus últimos datos.</AvisoWeb>
      ) : (
        <AvisoWeb tono="error">
          No pudimos cargar tus ingresos. Reintentando…
        </AvisoWeb>
      )
    ) : null;

  const topes = avances.map((a) => (
    <TarjetaTope key={a.id} a={a} listo={listo} />
  ));
  const fecha = <FechaLimite ahora={ahora} />;
  const multa = <Multa ahora={ahora} ingresos={ingresos} />;
  const pie = <p className="text-web-xs text-ink/70">{AVISO_TRIBUTARIO}</p>;

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-28 pt-4 font-[family-name:var(--font-web)] lg:hidden">
          <EncabezadoMovil />
          {aviso}
          <div className="grid grid-cols-2 gap-4">{topes}</div>
          {fecha}
          {multa}
          <CarruselTips titulo="Lo que debes saber" tips={TIPS} />
          {pie}
        </main>
        <NavMovil seccion="impuestos" />
      </SoloMovil>

      <PantallaWeb
        nav={<NavComercio seccion="impuestos" />}
        hero={
          <HeroWeb
            insignia="Impuestos"
            IconoInsignia={IconEscudo}
            titulo="Cumple a tiempo, sin sustos"
            subtitulo="Tus ventas del año frente a los topes de la DIAN."
            comercio={comercio}
            tarjeta={{
              rotulo: `Cobrado en ${ANIO_GRAVABLE_EN_CURSO}`,
              valor: listo ? pesosWeb(ingresos) : "…",
            }}
          />
        }
      >
        {aviso}
        <div className="web-escalonado grid min-h-0 flex-1 grid-cols-4 gap-(--separacion)">
          {topes}
          {fecha}
          {multa}
        </div>
        <CarruselTips titulo="Lo que debes saber" tips={TIPS} />
        {pie}
      </PantallaWeb>
    </>
  );
}

/** Anillo con el porcentaje del tope. */
function Anillo({ porcentaje, trazo }: { porcentaje: number; trazo: string }) {
  const r = 22;
  const vuelta = 2 * Math.PI * r;
  const lleno = (Math.min(porcentaje, 100) / 100) * vuelta;
  return (
    <span className="relative grid size-14 shrink-0 place-items-center">
      <svg
        viewBox="0 0 56 56"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="6"
          className="stroke-aqua/35"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${lleno} ${vuelta}`}
          className={`transition-[stroke-dasharray] duration-500 ${trazo}`}
        />
      </svg>
      <span className="text-web-xs font-bold text-tinta">{porcentaje}%</span>
    </span>
  );
}

function TarjetaTope({ a, listo }: { a: AvanceTope; listo: boolean }) {
  const { porcentaje, restante, nivel } = a.progreso;
  const estilo = NIVEL[nivel];
  const tope = TOPE[a.id] ?? {
    Icono: IconDocumento,
    tono: "primario" as const,
    nombre: a.nombre,
  };
  return (
    <TarjetaDato
      Icono={tope.Icono}
      tono={tope.tono}
      etiqueta={tope.nombre}
      valor={listo ? estilo.etiqueta : "…"}
      claseValor={estilo.texto}
      esquina={
        <Anillo porcentaje={listo ? porcentaje : 0} trazo={TRAZO[nivel]} />
      }
      detalle={
        !listo ? undefined : nivel === "ok" ? (
          <>Te faltan {pesosWeb(restante)}</>
        ) : (
          <span role="alert" className={`font-bold ${estilo.texto}`}>
            {SI_SUPERAS[a.id]}
          </span>
        )
      }
    />
  );
}

function FechaLimite({ ahora }: { ahora: number }) {
  const [digitos, setDigitos] = useDocumento();
  const hoy = hoyEnColombia(ahora);
  const plazo = plazoRenta(digitos);
  const estado = plazo ? estadoPlazo(plazo, hoy) : null;
  const vencido = estado?.tipo === "vencido";

  return (
    <TarjetaDato
      Icono={IconReloj}
      tono="agua"
      etiqueta={`Fecha para declarar renta ${ANIO_GRAVABLE_A_DECLARAR}`}
      destacado
      valor={
        plazo
          ? new Date(`${plazo}T12:00:00-05:00`).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              timeZone: "America/Bogota",
            })
          : undefined
      }
      claseValor={vencido ? "text-error" : "text-tinta"}
      esquina={
        plazo ? (
          <button
            type="button"
            onClick={() => setDigitos("")}
            className="h-10 rounded-full bg-white/80 px-4 text-web-sm font-bold text-primary shadow-suave transition-colors duration-200 hover:bg-white"
          >
            Cambiar
          </button>
        ) : null
      }
      detalle={
        estado ? (
          <span
            role={estado.tipo === "holgado" ? undefined : "alert"}
            className={`font-bold ${vencido ? "text-error" : "text-primary"}`}
          >
            {estado.tipo === "vencido"
              ? `Venció hace ${estado.dias} ${estado.dias === 1 ? "día" : "días"}. Declara cuanto antes.`
              : estado.tipo === "hoy"
                ? "Vence hoy."
                : `Faltan ${estado.dias} días.`}
          </span>
        ) : undefined
      }
    >
      {plazo ? null : (
        <label className="mt-1 flex flex-col gap-2 text-web-sm">
          <span className="text-ink/70">
            Escribe los 2 últimos dígitos de tu cédula o NIT
          </span>
          <input
            value={digitos}
            onChange={(e) => setDigitos(soloDigitos(e.target.value, 2))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="00"
            className="campo-web max-w-28 text-center font-bold tracking-[0.3em]"
          />
        </label>
      )}
    </TarjetaDato>
  );
}

function Multa({ ahora, ingresos }: { ahora: number; ingresos: number }) {
  const [digitos] = useDocumento();
  const plazo = plazoRenta(digitos);
  const sugeridos = plazo ? mesesDeRetraso(plazo, hoyEnColombia(ahora)) : 0;
  const [meses, setMeses] = useState<number | null>(null);
  const m = meses ?? Math.min(Math.max(sugeridos, 1), 12);
  // Con lo cobrado en Trivo este año y sin impuesto a cargo: el caso más común.
  const tarde = multaExtemporanea({ ingresos, impuesto: 0, meses: m });
  const emplazado = multaPorNoDeclarar(ingresos);

  return (
    <TarjetaDato
      Icono={IconEscudo}
      tono="tinta"
      etiqueta="Si declaras tarde, pagarías"
      valor={`≈ ${pesosWeb(tarde)}`}
      esquina={
        <Selector
          etiqueta="Meses de retraso"
          valor={String(m)}
          onCambio={(v) => setMeses(Number(v))}
          opciones={MESES}
          compacto
        />
      }
      detalle={
        <>
          Si esperas a que la DIAN te busque:{" "}
          <strong className="text-error">≈ {pesosWeb(emplazado)}</strong>
        </>
      }
    />
  );
}
