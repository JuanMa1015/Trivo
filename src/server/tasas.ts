/**
 * Tasa de referencia de mercado, solo para mostrar al pagador cuánto de lo que paga
 * es costo de conversión de su wallet. No se usa para cobrar: la tasa real es la de
 * la cotización que firma su wallet.
 * Fuente: open.er-api.com (sin llave, una actualización al día; pide atribución).
 */
const URL_TASAS = "https://open.er-api.com/v6/latest/USD";
const VIGENCIA_MS = 6 * 60 * 60 * 1000;
const REINTENTO_MS = 5 * 60 * 1000;
const ESPERA_MS = 3_000;

export type TasaReferencia = (de: string, a: string) => Promise<number | null>;

export function crearTasaReferencia(
  traer: typeof fetch = fetch,
  ahora: () => number = Date.now,
): TasaReferencia {
  let tabla: { usd: Record<string, number> | null; hasta: number } | undefined;

  async function usd(): Promise<Record<string, number> | null> {
    if (tabla && tabla.hasta > ahora()) return tabla.usd;
    try {
      const r = await traer(URL_TASAS, {
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      const j = (await r.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (!r.ok || j.result !== "success" || !j.rates)
        throw new Error("respuesta inválida");
      tabla = { usd: j.rates, hasta: ahora() + VIGENCIA_MS };
    } catch {
      // Sin referencia no se rompe nada: el pagador ve su precio sin esa comparación.
      tabla = { usd: null, hasta: ahora() + REINTENTO_MS };
    }
    return tabla.usd;
  }

  return async (de, a) => {
    const t = await usd();
    const [deUsd, aUsd] = [t?.[de], t?.[a]];
    return deUsd && aUsd && deUsd > 0 ? aUsd / deUsd : null;
  };
}
