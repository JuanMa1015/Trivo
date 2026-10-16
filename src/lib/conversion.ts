/**
 * Tasa observada en una quote real de la testnet (31.767,87 COP por 10,00 USD).
 * Solo para el demo: en producción sale de la quote de Open Payments.
 */
export const TASA_EJEMPLO_COP_POR_USD = 3176.787;

export function copAUsd(cop: number, tasa = TASA_EJEMPLO_COP_POR_USD): number {
  return Math.round((cop / tasa) * 100) / 100;
}
