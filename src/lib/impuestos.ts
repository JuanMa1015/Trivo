import { calcularProgreso, TOPES_UVT, valorUvt, type Progreso } from "./topes";

/**
 * Impuestos para el vendedor colombiano: plazos, avance hacia los topes y estimación de
 * sanciones. Son datos y fórmulas, no asesoría: se actualizan cada año y las cifras
 * de sanciones son orientativas. Validar con la DIAN o un contador.
 * Fuentes: Estatuto Tributario (arts. 592-594-3, 639, 641, 642, 643), DIAN (UVT 2026:
 * Resolución 238 de 2025) y el calendario tributario 2026.
 */

export const ANIO_GRAVABLE_A_DECLARAR = 2025;
export const ANIO_GRAVABLE_EN_CURSO = 2026;

/**
 * Fechas límite de la declaración de renta de personas naturales del año gravable 2025, en
 * orden de los dos últimos dígitos del documento: 01-02, 03-04, … 97-98, 99-00.
 * Fuente: calendario tributario DIAN 2026 (Decreto 2229 de 2023). Confirmar en dian.gov.co.
 */
const PLAZOS_RENTA_2026 = [
  "08-12",
  "08-13",
  "08-14",
  "08-18",
  "08-19",
  "08-20",
  "08-21",
  "08-24",
  "08-25",
  "08-26",
  "08-27",
  "08-28",
  "08-31",
  "09-01",
  "09-02",
  "09-03",
  "09-04",
  "09-07",
  "09-08",
  "09-09",
  "09-10",
  "09-11",
  "09-14",
  "09-15",
  "09-16",
  "09-17",
  "09-18",
  "09-21",
  "09-22",
  "09-23",
  "09-24",
  "09-25",
  "09-28",
  "10-01",
  "10-02",
  "10-05",
  "10-06",
  "10-07",
  "10-08",
  "10-09",
  "10-13",
  "10-14",
  "10-15",
  "10-16",
  "10-19",
  "10-20",
  "10-21",
  "10-22",
  "10-23",
  "10-26",
] as const;

/** `YYYY-MM-DD` de la fecha límite según los dos últimos dígitos, o null si no son válidos. */
export function plazoRenta(dosDigitos: string): string | null {
  if (!/^\d{2}$/.test(dosDigitos)) return null;
  const n = Number(dosDigitos);
  const posicion =
    n === 0 ? PLAZOS_RENTA_2026.length - 1 : Math.ceil(n / 2) - 1;
  return `2026-${PLAZOS_RENTA_2026[posicion]}`;
}

/** Fecha de hoy en Colombia (`YYYY-MM-DD`): el plazo se cuenta por día, no por hora. */
export function hoyEnColombia(ahora: number): string {
  return new Date(ahora).toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
}

const DIA_MS = 86_400_000;

/** Días entre dos fechas `YYYY-MM-DD`: positivo si `hasta` es futura. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA_MS);
}

export type EstadoPlazo =
  | { tipo: "vencido"; dias: number }
  | { tipo: "hoy" }
  | { tipo: "proximo"; dias: number }
  | { tipo: "holgado"; dias: number };

/** Cuánto falta (o cuánto lleva vencido) un plazo; "proximo" si faltan 15 días o menos. */
export function estadoPlazo(plazo: string, hoy: string): EstadoPlazo {
  const dias = diasEntre(hoy, plazo);
  if (dias < 0) return { tipo: "vencido", dias: -dias };
  if (dias === 0) return { tipo: "hoy" };
  return dias <= 15 ? { tipo: "proximo", dias } : { tipo: "holgado", dias };
}

/** Meses o fracciones de mes de retraso entre el plazo y hoy (cada mes empezado cuenta completo). */
export function mesesDeRetraso(plazo: string, hoy: string): number {
  const dias = diasEntre(plazo, hoy);
  return dias <= 0 ? 0 : Math.ceil(dias / 30);
}

/**
 * Límites de un año calendario en hora de Colombia (UTC-5, sin horario de verano),
 * en milisegundos: `desde` incluido, `hasta` excluido.
 */
export function limitesDelAnio(anio: number): { desde: number; hasta: number } {
  return {
    desde: Date.UTC(anio, 0, 1, 5),
    hasta: Date.UTC(anio + 1, 0, 1, 5),
  };
}

/** Límites de un mes `YYYY-MM` en hora de Colombia, en milisegundos (`hasta` excluido). */
export function limitesDelMes(periodo: string): {
  desde: number;
  hasta: number;
} {
  const [anio, mes] = periodo.split("-").map(Number);
  return {
    desde: Date.UTC(anio, mes - 1, 1, 5),
    hasta: Date.UTC(anio, mes, 1, 5),
  };
}

/** El mes `n` meses antes de `periodo` (`YYYY-MM`). */
export function mesAnterior(periodo: string, n: number): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 - n, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "octubre de 2026" para un periodo `YYYY-MM`. */
export function nombreDelPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, 15)).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// --------------------------------------------------------------------------- avance

export type AvanceTope = {
  id: string;
  nombre: string;
  descripcion: string;
  limite: number;
  progreso: Progreso;
};

/** Avance del año gravable en curso hacia cada tope, con lo cobrado en Trivo. */
export function avancesDelAnio(
  ingresos: number,
  anio: number = ANIO_GRAVABLE_EN_CURSO,
): AvanceTope[] {
  const uvt = valorUvt(anio);
  return TOPES_UVT.map((tope) => {
    const limite = tope.uvt * uvt;
    return {
      id: tope.id,
      nombre: tope.nombre,
      descripcion: tope.descripcion,
      limite,
      progreso: calcularProgreso(ingresos, limite),
    };
  });
}

// ------------------------------------------------------------------------- sanciones

const SANCION_MINIMA_UVT = 10;
const TOPE_SIN_IMPUESTO_UVT = 2_500;

export type EntradaMulta = {
  /** Ingresos brutos del año que se declara. */
  ingresos: number;
  /** Impuesto a cargo; 0 si la declaración no arroja impuesto. */
  impuesto: number;
  /** Meses o fracciones de mes de retraso. */
  meses: number;
  uvt?: number;
};

/** Ninguna sanción baja de 10 UVT (art. 639 E.T.). */
export const sancionMinima = (uvt = valorUvt(ANIO_GRAVABLE_EN_CURSO)): number =>
  SANCION_MINIMA_UVT * uvt;

/**
 * Sanción por declarar tarde por voluntad propia (art. 641 E.T.), sin intereses:
 * - con impuesto a cargo: 5 % del impuesto por cada mes o fracción, sin pasar del 100 %;
 * - sin impuesto: 0,5 % de los ingresos brutos por mes, sin pasar de 5 % de los ingresos
 *   ni de 2.500 UVT (tope por confirmar con el texto vigente).
 * Siempre al menos 10 UVT.
 */
export function multaExtemporanea({
  ingresos,
  impuesto,
  meses,
  uvt = valorUvt(ANIO_GRAVABLE_EN_CURSO),
}: EntradaMulta): number {
  const m = Math.max(1, Math.ceil(meses));
  const base =
    impuesto > 0
      ? Math.min(impuesto * 0.05 * m, impuesto)
      : Math.min(
          ingresos * 0.005 * m,
          ingresos * 0.05,
          TOPE_SIN_IMPUESTO_UVT * uvt,
        );
  return Math.max(Math.round(base), sancionMinima(uvt));
}

/**
 * Sanción por no declarar tras el emplazamiento de la DIAN (art. 643 E.T.): 20 % de la
 * base que ella conozca (consignaciones o ingresos), si es mayor que la de tu última
 * declaración. Aquí se usa lo que el usuario dice haber ingresado. Mínimo 10 UVT.
 */
export function multaPorNoDeclarar(
  ingresos: number,
  uvt = valorUvt(ANIO_GRAVABLE_EN_CURSO),
): number {
  return Math.max(Math.round(ingresos * 0.2), sancionMinima(uvt));
}

// -------------------------------------------------------------------------- consejos

export const NO_EXIME =
  "No conocer la norma no te exime de cumplirla: la obligación nace cuando superas el tope, sepas o no que existe.";

export type Consejo = { titulo: string; texto: string };

export const CONSEJOS: readonly Consejo[] = [
  {
    titulo: "Declarar aunque no debas pagar",
    texto:
      "Si superas un tope estás obligado a declarar, aunque el impuesto salga en cero. Presentarla tarde también se sanciona.",
  },
  {
    titulo: "Un solo tope basta",
    texto:
      "Declaras renta si superas cualquiera: ingresos, consumos con tarjeta, compras, consignaciones o patrimonio. No hace falta cumplir todos.",
  },
  {
    titulo: "Tus cobros dejan rastro",
    texto:
      "Los bancos y plataformas reportan movimientos a la DIAN. Lo que cobras por wallet o banco puede aparecer en su cruce de información.",
  },
  {
    titulo: "Guarda tus soportes",
    texto:
      "Conserva comprobantes, facturas y extractos por al menos 5 años: la DIAN puede pedirlos para revisar tu declaración.",
  },
  {
    titulo: "Pasar el tope de facturación",
    texto:
      "Al superar los ingresos que te permiten no facturar, debes inscribirte como responsable y facturar electrónicamente. El comprobante de Trivo no es factura.",
  },
  {
    titulo: "Ponte al día antes de que te emplacen",
    texto:
      "Si ya te pasaste del plazo, declarar por voluntad propia cuesta mucho menos que esperar el emplazamiento de la DIAN: las sanciones se duplican.",
  },
];
