"use client";

import { EncabezadoMovil } from "@/components/encabezado-movil";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { IconDocumento, IconEscudo, IconReloj } from "@/components/icons";
import {
  AvisoWeb,
  DosColumnasWeb,
  EncabezadoTarjeta,
  PantallaWeb,
} from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { NavComercio } from "@/components/web/nav-web";
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
  sancionMinima,
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

const SI_SUPERAS: Record<string, string> = {
  "renta-ingresos": `Si cierras ${ANIO_GRAVABLE_EN_CURSO} por encima de este tope, tendrás que declarar renta del año ${ANIO_GRAVABLE_EN_CURSO}, aunque no debas pagar impuesto.`,
  facturacion:
    "Si lo superas, debes inscribirte como responsable de IVA y facturar electrónicamente cada venta.",
};

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
 * Impuestos (/impuestos): cuánto va del año frente a los topes de la DIAN, el plazo de
 * la declaración, cuánto puede costar no cumplir y consejos. Informativo, no asesoría.
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

  const avance = <Avance avances={avances} ingresos={ingresos} listo={listo} />;
  const plazo = <Plazo ahora={ahora} />;
  const multa = <Multa ahora={ahora} />;
  const consejos = <Consejos />;
  const pie = <p className="text-web-xs text-ink/60">{AVISO_TRIBUTARIO}</p>;

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-10 pt-4 font-[family-name:var(--font-web)] lg:hidden">
          <EncabezadoMovil />
          {aviso}
          <NoEximeBanner />
          {avance}
          {plazo}
          {multa}
          {consejos}
          {pie}
        </main>
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
        <NoEximeBanner />
        <DosColumnasWeb>
          <div className="flex min-h-0 flex-col gap-(--separacion)">
            {avance}
            {plazo}
          </div>
          <div className="flex min-h-0 flex-col gap-(--separacion)">
            {multa}
            {consejos}
          </div>
        </DosColumnasWeb>
        {pie}
      </PantallaWeb>
    </>
  );
}

function NoEximeBanner() {
  return (
    <section
      role="note"
      className="web-subir flex items-center gap-4 rounded-web bg-tinta px-6 py-4 text-white shadow-tarjeta"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-aqua">
        <IconEscudo width={20} height={20} />
      </span>
      <p className="text-web-sm">
        <strong className="text-aqua">Ojo: </strong>
        {NO_EXIME}
      </p>
    </section>
  );
}

function Tarjeta({
  icono,
  titulo,
  subtitulo,
  children,
}: {
  icono: ReactNode;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <section className="tarjeta-web web-escalonado flex flex-col gap-5 p-6">
      <EncabezadoTarjeta icono={icono} titulo={titulo} subtitulo={subtitulo} />
      {children}
    </section>
  );
}

// ------------------------------------------------------------------------- avance

function Avance({
  avances,
  ingresos,
  listo,
}: {
  avances: AvanceTope[];
  ingresos: number;
  listo: boolean;
}) {
  return (
    <Tarjeta
      icono={<IconDocumento width={24} height={24} />}
      titulo={`Tu avance en ${ANIO_GRAVABLE_EN_CURSO}`}
      subtitulo="Lo cobrado con Trivo este año frente a cada tope"
    >
      <ul className="flex flex-col gap-6">
        {avances.map((a) => (
          <li key={a.id}>
            <BarraTope a={a} ingresos={ingresos} listo={listo} />
          </li>
        ))}
      </ul>
      <p className="text-web-xs text-ink/60">
        Solo suma lo que cobras con Trivo. Si vendes también por otros medios,
        suma esos ingresos: los topes miran todo lo que ganas en el año.
      </p>
    </Tarjeta>
  );
}

function BarraTope({
  a,
  ingresos,
  listo,
}: {
  a: AvanceTope;
  ingresos: number;
  listo: boolean;
}) {
  const { porcentaje, restante, nivel } = a.progreso;
  const estilo = NIVEL[nivel];
  const ancho = Math.min(porcentaje, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-tinta">{a.nombre}</h3>
        <span className={`text-web-sm font-bold ${estilo.texto}`}>
          {listo ? estilo.etiqueta : "…"}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={a.nombre}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ancho}
        aria-valuetext={`${porcentaje}% del tope`}
        className="h-3 overflow-hidden rounded-full bg-aqua/30"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${estilo.barra}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <p className="text-web-sm text-ink/70">
        <strong className="text-tinta">{pesosWeb(ingresos)}</strong> de{" "}
        {pesosWeb(a.limite)} ({porcentaje}%)
        {nivel === "superado" ? null : <> · te faltan {pesosWeb(restante)}</>}
      </p>
      <p className="text-web-xs text-ink/60">{a.descripcion}</p>
      <p
        className={`text-web-xs ${nivel === "ok" ? "text-ink/60" : `font-bold ${estilo.texto}`}`}
        role={nivel === "ok" ? undefined : "alert"}
      >
        {SI_SUPERAS[a.id]}
      </p>
    </div>
  );
}

// -------------------------------------------------------------------------- plazo

function Plazo({ ahora }: { ahora: number }) {
  const [digitos, setDigitos] = useDocumento();
  const hoy = hoyEnColombia(ahora);
  const plazo = plazoRenta(digitos);
  const estado = plazo ? estadoPlazo(plazo, hoy) : null;
  const meses = plazo ? mesesDeRetraso(plazo, hoy) : 0;

  return (
    <Tarjeta
      icono={<IconReloj width={24} height={24} />}
      titulo={`Declaración de renta del año ${ANIO_GRAVABLE_A_DECLARAR}`}
      subtitulo="Se presenta en agosto, septiembre y octubre de 2026"
    >
      <label className="flex flex-col gap-2 text-web-sm">
        <span className="font-bold">
          Dos últimos dígitos de tu cédula o NIT (sin el dígito de verificación)
        </span>
        <input
          value={digitos}
          onChange={(e) => setDigitos(soloDigitos(e.target.value, 2))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="00"
          className="campo-web w-28 text-center font-bold tracking-[0.3em]"
        />
      </label>

      {plazo && estado ? (
        <div
          className={`rounded-3xl p-5 text-web-sm ${
            estado.tipo === "vencido" ? "bg-error/10" : "bg-aqua/12"
          }`}
          role={estado.tipo === "holgado" ? undefined : "alert"}
        >
          <p className="text-web-xs text-ink/60">Tu fecha límite</p>
          <p className="text-medio font-extrabold text-tinta">
            {new Date(`${plazo}T12:00:00-05:00`).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "America/Bogota",
            })}
          </p>
          <p
            className={`mt-1 font-bold ${estado.tipo === "vencido" ? "text-error" : "text-primary"}`}
          >
            {estado.tipo === "vencido"
              ? `Venció hace ${estado.dias} ${estado.dias === 1 ? "día" : "días"}. Si debías declarar, hazlo ya: ${meses} ${meses === 1 ? "mes" : "meses"} de retraso cuentan para la sanción.`
              : estado.tipo === "hoy"
                ? "Vence hoy. No lo dejes para última hora."
                : `Faltan ${estado.dias} días.`}
          </p>
        </div>
      ) : digitos.length === 2 ? null : (
        <p className="text-web-xs text-ink/60">
          Escribe los dos dígitos para ver tu fecha límite.
        </p>
      )}

      <p className="text-web-xs text-ink/60">
        Fechas del calendario tributario DIAN 2026. Confírmalas en dian.gov.co:
        si estás obligado a declarar y no lo has hecho, hazlo cuanto antes.
      </p>
    </Tarjeta>
  );
}

// -------------------------------------------------------------------------- multa

function Multa({ ahora }: { ahora: number }) {
  const [digitos] = useDocumento();
  const plazo = plazoRenta(digitos);
  const sugeridos = plazo ? mesesDeRetraso(plazo, hoyEnColombia(ahora)) : 0;
  const [ingresos, setIngresos] = useState("");
  const [impuesto, setImpuesto] = useState("");
  const [meses, setMeses] = useState<number | null>(null);
  const m = meses ?? Math.max(sugeridos, 1);

  const ing = Number(ingresos) || 0;
  const imp = Number(impuesto) || 0;
  const tarde = multaExtemporanea({ ingresos: ing, impuesto: imp, meses: m });
  const noDeclarar = multaPorNoDeclarar(ing);

  return (
    <Tarjeta
      icono={<IconEscudo width={24} height={24} />}
      titulo="¿Cuánto puede costar no declarar?"
      subtitulo="Estimación orientativa, sin intereses"
    >
      <div className="grid grid-cols-2 gap-4 text-web-sm">
        <Campo
          etiqueta="Ingresos del año ($)"
          valor={ingresos}
          alCambiar={(v) => setIngresos(soloDigitos(v, 11))}
        />
        <Campo
          etiqueta="Impuesto a cargo ($), si lo sabes"
          valor={impuesto}
          alCambiar={(v) => setImpuesto(soloDigitos(v, 11))}
        />
        <label className="col-span-2 flex flex-col gap-2">
          <span className="font-bold">Meses de retraso</span>
          <select
            value={m}
            onChange={(e) => setMeses(Number(e.target.value))}
            className="campo-web"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "mes" : "meses"}
                {n === 12 ? " o más" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <Resultado
          titulo="Si declaras tarde por tu cuenta"
          valor={tarde}
          nota={
            imp > 0
              ? "5 % del impuesto por cada mes o fracción (máximo 100 %)."
              : "0,5 % de tus ingresos por mes de retraso, con tope."
          }
        />
        <Resultado
          titulo="Si la DIAN te emplaza y sigues sin declarar"
          valor={noDeclarar}
          nota="20 % de tus ingresos (o de lo que ella conozca de ti)."
          grave
        />
      </div>

      <p className="text-web-xs text-ink/60">
        Ninguna sanción baja de {pesosWeb(sancionMinima())} (10 UVT). Además se
        cobran intereses por mora, y declarar tarde por tu cuenta siempre cuesta
        menos que esperar a que te emplacen.
      </p>
    </Tarjeta>
  );
}

function Campo({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-bold">{etiqueta}</span>
      <input
        value={valor ? Number(valor).toLocaleString("es-CO") : ""}
        onChange={(e) => alCambiar(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        className="campo-web"
      />
    </label>
  );
}

function Resultado({
  titulo,
  valor,
  nota,
  grave = false,
}: {
  titulo: string;
  valor: number;
  nota: string;
  grave?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-5 ${grave ? "bg-error/10" : "bg-aqua/12"}`}
      aria-live="polite"
    >
      <p className="text-web-sm font-bold text-ink/70">{titulo}</p>
      <p
        className={`text-medio font-extrabold ${grave ? "text-error" : "text-primary"}`}
      >
        ≈ {pesosWeb(valor)}
      </p>
      <p className="text-web-xs text-ink/60">{nota}</p>
    </div>
  );
}

// ----------------------------------------------------------------------- consejos

function Consejos() {
  return (
    <Tarjeta
      icono={<IconDocumento width={24} height={24} />}
      titulo="Lo que debes saber"
      subtitulo="Para no llevarte sorpresas con la DIAN"
    >
      <ul className="flex flex-col gap-4">
        {CONSEJOS.map((c) => (
          <li key={c.titulo} className="flex gap-3">
            <span
              className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <p className="text-web-sm text-ink/70">
              <strong className="text-tinta">{c.titulo}. </strong>
              {c.texto}
            </p>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
