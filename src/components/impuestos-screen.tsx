"use client";

import { useId, useState, useSyncExternalStore } from "react";
import {
  IconCalculadora,
  IconDocumento,
  IconEscudo,
  IconGrafico,
  IconInfo,
  IconReloj,
} from "@/components/icons";
import { CarruselTips } from "@/components/web/carrusel-tips";
import { AvisoWeb, PantallaWeb } from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import type { Tono3D } from "@/components/web/icono-3d";
import { NavComercio } from "@/components/web/nav-web";
import { Modal } from "@/components/web/modal";
import { TarjetaDato } from "@/components/web/tarjeta-dato";
import {
  ANIO_GRAVABLE_A_DECLARAR,
  ANIO_GRAVABLE_EN_CURSO,
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

/** Lo que pasa al acercarse o pasar cada tope, en una línea. */
const SI_SUPERAS: Record<string, string> = {
  "renta-ingresos": `Tendrás que declarar renta de ${ANIO_GRAVABLE_EN_CURSO}.`,
  facturacion: "Tendrás que facturar electrónicamente.",
};

/** Lo mismo, completo, para el globo de información. */
const SI_SUPERAS_COMPLETO: Record<string, string> = {
  "renta-ingresos": `Si cierras ${ANIO_GRAVABLE_EN_CURSO} por encima de este tope, tendrás que declarar renta del año ${ANIO_GRAVABLE_EN_CURSO}, aunque no debas pagar impuesto.`,
  facturacion:
    "Si lo superas, debes inscribirte como responsable de IVA y facturar electrónicamente cada venta.",
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

/** Lo que debes saber, uno a la vez y en pocas palabras. */
const TIPS = [
  {
    titulo: "Ojo",
    texto:
      "No saber la norma no te exime: la obligación nace al pasar el tope.",
  },
  {
    titulo: "Declara aunque no pagues",
    texto: "Si pasas un tope, declaras aunque el impuesto salga en cero.",
  },
  {
    titulo: "Un tope basta",
    texto:
      "Ingresos, compras, consignaciones o patrimonio: con pasar uno, declaras.",
  },
  {
    titulo: "Suma todo",
    texto:
      "Aquí solo cuenta lo cobrado con Trivo. Suma lo que vendes por otros medios.",
  },
  {
    titulo: "Tus cobros dejan rastro",
    texto: "Bancos y wallets reportan movimientos a la DIAN.",
  },
  {
    titulo: "Guarda tus soportes",
    texto: "Comprobantes y facturas, por al menos 5 años.",
  },
  {
    titulo: "Ponte al día pronto",
    texto: "Declarar tarde por tu cuenta cuesta menos que esperar a la DIAN.",
  },
];

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
    <TarjetaTope key={a.id} a={a} ingresos={ingresos} listo={listo} />
  ));
  const fecha = <FechaLimite ahora={ahora} />;
  const multa = <Multa ahora={ahora} />;
  const pie = <p className="text-web-xs text-ink/70">{AVISO_TRIBUTARIO}</p>;

  return (
    <>
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
        {/* Encima de los consejos: la información de un tope puede pasar sobre ellos. */}
        <div className="web-escalonado relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-(--separacion) sm:grid-cols-2 lg:grid-cols-4">
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

function TarjetaTope({
  a,
  ingresos,
  listo,
}: {
  a: AvanceTope;
  ingresos: number;
  listo: boolean;
}) {
  const id = useId();
  const { porcentaje, restante, nivel } = a.progreso;
  const estilo = NIVEL[nivel];
  const tope = TOPE[a.id] ?? {
    Icono: IconDocumento,
    tono: "primario" as const,
    nombre: a.nombre,
  };
  return (
    // La información completa aparece sobre la tarjeta: con el mouse encima, con el foco
    // del teclado o al tocarla en el celular. En la tarjeta queda solo lo justo.
    <div
      tabIndex={0}
      aria-describedby={`${id}-info`}
      className="group relative z-0 grid cursor-help rounded-web outline-none hover:z-30 focus:z-30 focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      <TarjetaDato
        Icono={tope.Icono}
        tono={tope.tono}
        etiqueta={tope.nombre}
        valor={listo ? estilo.etiqueta : "…"}
        claseValor={estilo.texto}
        esquina={
          <span className="flex items-center gap-2">
            <IconInfo
              width={18}
              height={18}
              className="text-ink/50 transition-colors duration-200 group-hover:text-primary"
            />
            <Anillo porcentaje={listo ? porcentaje : 0} trazo={TRAZO[nivel]} />
          </span>
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
      <div
        id={`${id}-info`}
        role="tooltip"
        className="pointer-events-none invisible absolute inset-x-0 top-0 z-40 flex min-h-full scale-[0.98] flex-col justify-center gap-2 rounded-web bg-tinta p-5 text-web-sm text-white opacity-0 shadow-tarjeta ring-2 ring-aqua/50 transition-[opacity,scale,visibility] duration-200 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus:visible group-focus:scale-100 group-focus:opacity-100"
      >
        <p className="font-bold text-aqua">{a.nombre}</p>
        <p>
          <strong>{pesosWeb(ingresos)}</strong> de {pesosWeb(a.limite)} (
          {porcentaje}%)
          {nivel === "superado" ? null : <> · te faltan {pesosWeb(restante)}</>}
        </p>
        <p className="text-white/80">{a.descripcion}</p>
        <p className="text-white/80">{SI_SUPERAS_COMPLETO[a.id]}</p>
      </div>
    </div>
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
            className="pildora-web"
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
            Últimos 2 dígitos de tu cédula o NIT
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

/** Tarjeta de entrada: el cálculo, con su formulario, va en un modal. */
function Multa({ ahora }: { ahora: number }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <TarjetaDato
        Icono={IconEscudo}
        tono="tinta"
        etiqueta="Declarar tarde cuesta desde"
        valor={pesosWeb(sancionMinima())}
        esquina={
          <button
            type="button"
            onClick={() => setAbierto(true)}
            aria-haspopup="dialog"
            className="pildora-web"
          >
            <IconCalculadora width={18} height={18} />
            Calcular
          </button>
        }
        detalle="Calcula tu caso en un minuto."
      />
      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="¿Cuánto cuesta declarar tarde?"
        subtitulo={`Declaración de renta del año ${ANIO_GRAVABLE_A_DECLARAR}.`}
      >
        {/* Se monta al abrir: cada vez empieza con los meses sugeridos. */}
        {abierto ? <CalculadoraMulta ahora={ahora} /> : null}
      </Modal>
    </>
  );
}

function CalculadoraMulta({ ahora }: { ahora: number }) {
  const [digitos] = useDocumento();
  const plazo = plazoRenta(digitos);
  const sugeridos = plazo ? mesesDeRetraso(plazo, hoyEnColombia(ahora)) : 0;
  const [ingresos, setIngresos] = useState("");
  const [impuesto, setImpuesto] = useState("");
  const [meses, setMeses] = useState(Math.min(Math.max(sugeridos, 1), 12));

  // Los ingresos son los del año que se declara: lo cobrado en Trivo este año no sirve.
  const ing = Number(ingresos) || 0;
  const imp = Number(impuesto) || 0;
  const minimo = sancionMinima();
  const tarde = multaExtemporanea({ ingresos: ing, impuesto: imp, meses });
  const sancionado = multaPorNoDeclarar(ing);

  return (
    <div className="flex flex-col gap-5 text-web-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={`Tus ingresos de ${ANIO_GRAVABLE_A_DECLARAR}`}
          valor={ingresos}
          alCambiar={(v) => setIngresos(soloDigitos(v, 11))}
        />
        <Campo
          etiqueta="Impuesto a pagar (opcional)"
          valor={impuesto}
          alCambiar={(v) => setImpuesto(soloDigitos(v, 11))}
        />
      </div>

      <fieldset>
        <legend className="mb-2 font-bold text-tinta">Meses de retraso</legend>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={meses === n}
              aria-label={`${n} ${n === 1 ? "mes" : "meses"}${n === 12 ? " o más" : ""}`}
              onClick={() => setMeses(n)}
              className="opcion-web"
            >
              {n === 12 ? "12+" : n}
            </button>
          ))}
        </div>
      </fieldset>

      {ing > 0 ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          aria-live="polite"
        >
          <Resultado
            titulo="Si declaras tarde"
            valor={tarde}
            minimo={tarde === minimo}
          />
          <Resultado
            titulo="Si la DIAN te sanciona por no declarar"
            valor={sancionado}
            minimo={sancionado === minimo}
            grave
          />
        </div>
      ) : (
        <p className="rounded-3xl bg-aqua/15 p-5 text-center text-ink/70">
          Escribe tus ingresos para ver el cálculo.
        </p>
      )}

      {ing > 0 && tarde === minimo ? (
        <p className="text-web-xs text-ink/70">
          Con esos ingresos aplica la sanción mínima de la ley (10 UVT): por eso
          no cambia con los meses.
        </p>
      ) : null}
      <p className="text-web-xs text-ink/70">
        Sin intereses de mora. Es una estimación: confírmala con la DIAN o un
        contador.
      </p>
    </div>
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
      <span className="font-bold text-tinta">{etiqueta}</span>
      <input
        value={valor ? `$${Number(valor).toLocaleString("es-CO")}` : ""}
        onChange={(e) => alCambiar(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        placeholder="$0"
        className="campo-web"
      />
    </label>
  );
}

function Resultado({
  titulo,
  valor,
  minimo,
  grave = false,
}: {
  titulo: string;
  valor: number;
  /** La fórmula da menos que la sanción mínima, que es la que se cobra. */
  minimo: boolean;
  grave?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-3xl p-5 ${grave ? "bg-error/10" : "bg-aqua/15"}`}
    >
      <p className="font-semibold text-ink/70">{titulo}</p>
      <p
        className={`text-medio font-extrabold ${grave ? "text-error" : "text-primary"}`}
      >
        ≈ {pesosWeb(valor)}
      </p>
      {minimo ? (
        <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-web-xs font-bold text-ink/70">
          Mínimo legal
        </span>
      ) : null}
    </div>
  );
}
