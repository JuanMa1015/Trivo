import type { CobroResumen } from "@/lib/cobros";

/** Lo mínimo de un cobro para resumir ventas. */
type CobroDato = Pick<
  CobroResumen,
  "estado" | "monto" | "creadoEn" | "pagadoEn"
>;

export const DIAS_CORTOS = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

export const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export type DiaResumen = { total: number; cobros: number };

export type Resumen = {
  /** Lo cobrado de lunes a domingo de la semana en curso; `dias[0]` es el lunes. */
  semana: { total: number; cobros: number; dias: DiaResumen[] };
  /** Lo cobrado hoy y los cobros que vencieron hoy. */
  hoy: { total: number; cobros: number; vencidos: number };
  /** Cobros que siguen esperando pago, de cualquier día. */
  esperando: number;
  /** Posición de hoy en `semana.dias`. */
  indiceHoy: number;
  /** Posición del día con más dinero cobrado; nulo si la semana va en cero. */
  mejorDia: number | null;
  /** Promedio por cobro de la semana, en pesos enteros. */
  promedio: number;
};

/** Día de la semana empezando en lunes (0) y terminando en domingo (6). */
export function indiceDia(fecha: Date): number {
  return (fecha.getDay() + 6) % 7;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Cuándo cuenta un cobro: cuando se pagó o, si no se ha pagado, cuando se creó. */
function fechaDelCobro(cobro: CobroDato): Date {
  return new Date(cobro.pagadoEn ?? cobro.creadoEn);
}

/** Resume los cobros en la semana y el día de `ahora`, en la hora local. */
export function calcularResumen(
  cobros: readonly CobroDato[],
  ahora: Date = new Date(),
): Resumen {
  const inicio = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() - indiceDia(ahora),
  );
  const fin = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate() + 7,
  );
  const dias: DiaResumen[] = Array.from({ length: 7 }, () => ({
    total: 0,
    cobros: 0,
  }));
  const hoy = { total: 0, cobros: 0, vencidos: 0 };
  let esperando = 0;

  for (const cobro of cobros) {
    const fecha = fechaDelCobro(cobro);
    const deHoy = mismoDia(fecha, ahora);

    if (cobro.estado === "esperando") esperando++;
    if (cobro.estado === "vencido" && deHoy) hoy.vencidos++;
    if (cobro.estado !== "cobrado") continue;

    if (deHoy) {
      hoy.total += cobro.monto;
      hoy.cobros++;
    }
    if (fecha >= inicio && fecha < fin) {
      const dia = dias[indiceDia(fecha)];
      dia.total += cobro.monto;
      dia.cobros++;
    }
  }

  const total = dias.reduce((suma, d) => suma + d.total, 0);
  const cantidad = dias.reduce((suma, d) => suma + d.cobros, 0);
  const maximo = Math.max(...dias.map((d) => d.total));

  return {
    semana: { total, cobros: cantidad, dias },
    hoy,
    esperando,
    indiceHoy: indiceDia(ahora),
    mejorDia: maximo > 0 ? dias.findIndex((d) => d.total === maximo) : null,
    promedio: cantidad > 0 ? Math.round(total / cantidad) : 0,
  };
}
