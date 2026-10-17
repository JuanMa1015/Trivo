import { formatearPesos } from "@/lib/format";

/**
 * El diseño web no separa el signo del número: "$185.000", no "$ 185.000".
 * Solo quita el espacio que Intl pone después de "$"; el resto del texto no cambia.
 */
export function montoWeb(texto: string): string {
  return texto.replace(/\$\s+/g, "$");
}

/** Pesos colombianos para el diseño web: "$50.000". */
export function pesosWeb(valor: number): string {
  return montoWeb(formatearPesos(valor));
}
