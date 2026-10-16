import { montoANumero, type Monto } from "./cobros";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPesos(valor: number): string {
  return cop.format(valor);
}

/** Un importe de Open Payments con el símbolo de su moneda, en el idioma de quien lo lee. */
export function formatearMonto(monto: Monto, locale: string): string {
  const valor = montoANumero(monto);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: monto.codigo,
      minimumFractionDigits: 0,
      maximumFractionDigits: monto.escala,
    }).format(valor);
  } catch {
    // Código de moneda que Intl no conoce: se muestra tal cual.
    return `${valor} ${monto.codigo}`;
  }
}
