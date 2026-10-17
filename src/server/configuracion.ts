import { accessSync, constants } from "node:fs";
import { secretoConfirmacion } from "./confirmacion";
import { leerConfigOpenPayments } from "./open-payments/config";
import { accesoConfigurado } from "./vendedor";

type Env = Record<string, string | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const legible = (ruta: string): boolean => {
  try {
    accessSync(ruta, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Lo que está mal en la configuración con la que arrancó el servidor, en palabras y sin
 * valores. Con el riel real, un secreto, una llave o un PIN a medio escribir no se nota
 * hasta que alguien intenta cobrar o un pago se confirma: aquí se detecta al arrancar.
 * Vacío = todo en orden.
 */
export function problemasDeConfiguracion(
  env: Env = process.env,
  archivoLegible: (ruta: string) => boolean = legible,
): string[] {
  const problemas: string[] = [];
  if (env.COBROS_STORE === "postgres" && !env.DATABASE_URL)
    problemas.push("DATABASE_URL: falta (COBROS_STORE=postgres la necesita)");
  if (env.COBROS_RAIL !== "open-payments") return problemas;

  // Un texto de ejemplo como <tu KeyId> o your-wallet no es un valor real.
  for (const [nombre, valor] of Object.entries(env)) {
    if (
      nombre.startsWith("OPEN_PAYMENTS_") ||
      nombre === "CONFIRMACION_SECRETO" ||
      nombre === "VENDEDOR_PIN" ||
      nombre === "APP_BASE_URL"
    ) {
      if (valor && (/[<>]/.test(valor) || /your-wallet/i.test(valor)))
        problemas.push(
          `${nombre}: tiene un texto de ejemplo, no un valor real`,
        );
    }
  }

  try {
    leerConfigOpenPayments(env);
  } catch {
    problemas.push(
      "OPEN_PAYMENTS_*/APP_BASE_URL: faltan o no son válidas (wallet, KeyId, ruta de la llave o URL pública)",
    );
  }
  if (env.OPEN_PAYMENTS_KEY_ID && !UUID.test(env.OPEN_PAYMENTS_KEY_ID))
    problemas.push(
      "OPEN_PAYMENTS_KEY_ID: no tiene forma de identificador (UUID)",
    );
  if (
    env.OPEN_PAYMENTS_PRIVATE_KEY_PATH &&
    !archivoLegible(env.OPEN_PAYMENTS_PRIVATE_KEY_PATH)
  )
    problemas.push(
      "OPEN_PAYMENTS_PRIVATE_KEY_PATH: el archivo de la llave no existe o no se puede leer",
    );
  try {
    secretoConfirmacion(env);
  } catch {
    problemas.push(
      "CONFIRMACION_SECRETO: falta o tiene menos de 32 caracteres",
    );
  }
  if (!accesoConfigurado(env))
    problemas.push("VENDEDOR_PIN: falta o tiene menos de 8 caracteres");

  return problemas;
}
