/**
 * Topes (umbrales) tributarios y de crédito, y su progreso.
 * Los valores de UVT y los topes en UVT son datos, no lógica: se actualizan
 * cada año aquí. Fuentes: DIAN (Resolución 238 de 2025; art. 437 E.T.).
 * Informativo, no es asesoría tributaria: validar con la DIAN o un contador.
 */

export const UVT_POR_ANIO: Readonly<Record<number, number>> = {
  2025: 49_799,
  2026: 52_374,
};

export type TopeUvt = {
  id: "facturacion" | "renta-ingresos";
  nombre: string;
  uvt: number;
  descripcion: string;
};

export const TOPES_UVT: readonly TopeUvt[] = [
  {
    id: "facturacion",
    nombre: "Obligación de facturar",
    uvt: 3_500,
    descripcion:
      "Persona natural no responsable de IVA: al superarlo deja de poder no facturar (art. 437 E.T., con todas sus condiciones).",
  },
  {
    id: "renta-ingresos",
    nombre: "Declaración de renta (ingresos)",
    uvt: 1_400,
    descripcion:
      "Ingresos brutos del año gravable que obligan a declarar renta.",
  },
];

export const AVISO_TRIBUTARIO =
  "Información orientativa, no es asesoría tributaria. Confirma las condiciones con la DIAN o un contador.";

export type Nivel = "ok" | "atencion" | "critico" | "superado";

export type Progreso = {
  porcentaje: number;
  restante: number;
  nivel: Nivel;
};

export function valorUvt(anio: number): number {
  const valor = UVT_POR_ANIO[anio];
  if (valor === undefined) throw new Error(`UVT no configurada para ${anio}`);
  return valor;
}

/** Límite en pesos de un tope para un año dado. */
export function limiteEnPesos(tope: TopeUvt, anio: number): number {
  return tope.uvt * valorUvt(anio);
}

/** Avisos al 70 %, 90 % y 100 % del límite. `porcentaje` no se recorta. */
export function calcularProgreso(acumulado: number, limite: number): Progreso {
  if (!(limite > 0)) throw new Error("El límite debe ser mayor que cero");
  if (!(acumulado >= 0)) throw new Error("El acumulado no puede ser negativo");

  const porcentaje = Math.floor((acumulado * 100) / limite);
  const nivel: Nivel =
    porcentaje >= 100
      ? "superado"
      : porcentaje >= 90
        ? "critico"
        : porcentaje >= 70
          ? "atencion"
          : "ok";

  return { porcentaje, restante: Math.max(limite - acumulado, 0), nivel };
}
