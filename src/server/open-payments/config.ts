import { z } from "zod";
import { validarUrlWallet } from "./seguridad";

const HOST_POR_DEFECTO = "ilp.interledger-test.dev";

const schema = z.object({
  OPEN_PAYMENTS_CLIENT_WALLET_URL: z.string().min(1),
  OPEN_PAYMENTS_KEY_ID: z.string().min(1),
  // Ruta al PEM de la llave privada. Nunca va al repo: se monta en el servidor.
  OPEN_PAYMENTS_PRIVATE_KEY_PATH: z.string().min(1),
  OPEN_PAYMENTS_RECEIVER_WALLET_URL: z.string().min(1).optional(),
  // Hosts de wallets de pagadores aceptados, separados por comas.
  OPEN_PAYMENTS_WALLET_HOSTS: z.string().optional(),
  APP_BASE_URL: z.url(),
});

export type ConfigOpenPayments = {
  clienteWalletUrl: string;
  keyId: string;
  privateKeyPath: string;
  /** Wallet donde caen los cobros (COP). Por defecto, la misma del cliente. */
  receptoraWalletUrl: string;
  hostsPermitidos: string[];
  appBaseUrl: string;
};

export function leerConfigOpenPayments(
  env: Record<string, string | undefined> = process.env,
): ConfigOpenPayments {
  const resultado = schema.safeParse(env);
  if (!resultado.success) {
    const campos = resultado.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `Configuración de Open Payments incompleta o inválida: ${campos}`,
    );
  }
  const e = resultado.data;
  const hosts = (e.OPEN_PAYMENTS_WALLET_HOSTS ?? HOST_POR_DEFECTO)
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const clienteWalletUrl = validarUrlWallet(e.OPEN_PAYMENTS_CLIENT_WALLET_URL);
  return {
    clienteWalletUrl,
    keyId: e.OPEN_PAYMENTS_KEY_ID,
    privateKeyPath: e.OPEN_PAYMENTS_PRIVATE_KEY_PATH,
    receptoraWalletUrl: e.OPEN_PAYMENTS_RECEIVER_WALLET_URL
      ? validarUrlWallet(e.OPEN_PAYMENTS_RECEIVER_WALLET_URL)
      : clienteWalletUrl,
    hostsPermitidos: hosts,
    appBaseUrl: e.APP_BASE_URL.replace(/\/+$/, ""),
  };
}
