import {
  OpenPaymentsClientError,
  createAuthenticatedClient,
  createUnauthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  type AuthenticatedClient,
  type GrantRequest,
  type UnauthenticatedClient,
} from "@interledger/open-payments";
import type { Monto } from "@/lib/cobros";
import type { ConfigOpenPayments } from "./config";
import { ErrorPago } from "./errores";
import type { DatosWallet, PuertoOpenPayments } from "./puerto";
import { validarUrlServidor, validarUrlWallet } from "./seguridad";

const COTIZACION_POR_DEFECTO_MS = 5 * 60 * 1000;

const aMonto = (a: {
  value: string;
  assetCode: string;
  assetScale: number;
}): Monto => ({
  valor: a.value,
  codigo: a.assetCode,
  escala: a.assetScale,
});

/** Traduce errores del SDK a uno nuestro, sin filtrar tokens ni cuerpos de respuesta. */
async function conSdk<T>(paso: string, trabajo: () => Promise<T>): Promise<T> {
  try {
    return await trabajo();
  } catch (error) {
    if (error instanceof ErrorPago) throw error;
    if (error instanceof OpenPaymentsClientError) {
      console.error(
        `open-payments: fallo en "${paso}"`,
        error.description,
        `status=${error.status ?? "?"}`,
      );
      throw new ErrorPago("open_payments_fallo", `Falló "${paso}"`, {
        cause: error,
      });
    }
    console.error(`open-payments: error inesperado en "${paso}"`, error);
    throw new ErrorPago("open_payments_fallo", `Falló "${paso}"`, {
      cause: error,
    });
  }
}

/** Implementación real contra el SDK oficial. Se crea al primer uso. */
export function crearPuertoOpenPayments(
  config: ConfigOpenPayments,
): PuertoOpenPayments {
  let autenticado: Promise<AuthenticatedClient> | undefined;
  let publico: Promise<UnauthenticatedClient> | undefined;

  const cliente = () =>
    (autenticado ??= createAuthenticatedClient({
      walletAddressUrl: config.clienteWalletUrl,
      privateKey: config.privateKeyPath,
      keyId: config.keyId,
    }));
  const clientePublico = () => (publico ??= createUnauthenticatedClient({}));

  /** Un grant no interactivo: si la wallet pide interacción, no es lo que esperamos. */
  async function tokenSinInteraccion(
    authServer: string,
    access: NonNullable<GrantRequest["access_token"]>["access"],
  ): Promise<string> {
    const grant = await (
      await cliente()
    ).grant.request(
      { url: validarUrlServidor(authServer) },
      { access_token: { access } },
    );
    if (!isFinalizedGrantWithAccessToken(grant)) {
      throw new ErrorPago(
        "open_payments_fallo",
        "La wallet pidió interacción inesperada",
      );
    }
    return grant.access_token.value;
  }

  return {
    leerWallet: (url) =>
      conSdk("leer wallet", async (): Promise<DatosWallet> => {
        const wallet = await (await cliente()).walletAddress.get({ url });
        if (validarUrlWallet(wallet.id) !== url) {
          throw new ErrorPago(
            "wallet_invalida",
            "La wallet no coincide con su dirección",
          );
        }
        return {
          url,
          nombre: wallet.publicName?.trim() || null,
          codigo: wallet.assetCode,
          escala: wallet.assetScale,
          authServer: validarUrlServidor(wallet.authServer),
          resourceServer: validarUrlServidor(wallet.resourceServer),
        };
      }),

    crearCobro: ({ receptora, monto, venceEn }) =>
      conSdk("crear incoming payment", async () => {
        const accessToken = await tokenSinInteraccion(receptora.authServer, [
          { type: "incoming-payment", actions: ["read", "create", "complete"] },
        ]);
        const incoming = await (
          await cliente()
        ).incomingPayment.create(
          { url: validarUrlServidor(receptora.resourceServer), accessToken },
          {
            walletAddress: receptora.url,
            incomingAmount: {
              value: monto.valor,
              assetCode: monto.codigo,
              assetScale: monto.escala,
            },
            expiresAt: venceEn.toISOString(),
          },
        );
        return { incomingPaymentUrl: incoming.id };
      }),

    cotizar: ({ pagador, incomingPaymentUrl }) =>
      conSdk("crear cotización", async () => {
        const accessToken = await tokenSinInteraccion(pagador.authServer, [
          { type: "quote", actions: ["create", "read"] },
        ]);
        const quote = await (
          await cliente()
        ).quote.create(
          { url: validarUrlServidor(pagador.resourceServer), accessToken },
          {
            walletAddress: pagador.url,
            receiver: incomingPaymentUrl,
            method: "ilp",
          },
        );
        return {
          quoteUrl: quote.id,
          debito: aMonto(quote.debitAmount),
          recibe: aMonto(quote.receiveAmount),
          venceEn:
            quote.expiresAt ??
            new Date(Date.now() + COTIZACION_POR_DEFECTO_MS).toISOString(),
        };
      }),

    iniciarConsentimiento: ({
      pagador,
      cotizacion,
      retornoUri,
      nonceCliente,
    }) =>
      conSdk("iniciar consentimiento", async () => {
        const grant = await (
          await cliente()
        ).grant.request(
          { url: validarUrlServidor(pagador.authServer) },
          {
            access_token: {
              access: [
                {
                  type: "outgoing-payment",
                  actions: ["read", "create"],
                  identifier: pagador.url,
                  // El permiso alcanza solo para este pago.
                  limits: {
                    debitAmount: {
                      value: cotizacion.debito.valor,
                      assetCode: cotizacion.debito.codigo,
                      assetScale: cotizacion.debito.escala,
                    },
                  },
                },
              ],
            },
            interact: {
              start: ["redirect"],
              finish: {
                method: "redirect",
                uri: retornoUri,
                nonce: nonceCliente,
              },
            },
          },
        );
        if (!isPendingGrant(grant)) {
          throw new ErrorPago(
            "open_payments_fallo",
            "Se esperaba un grant interactivo",
          );
        }
        // El consentimiento tiene que ocurrir en el dominio de la wallet del pagador;
        // si otro nos lo pidiera, estaríamos mandando personas a un sitio ajeno.
        const redirectUrl = validarUrlServidor(grant.interact.redirect);
        if (
          new URL(redirectUrl).hostname !== new URL(pagador.authServer).hostname
        ) {
          throw new ErrorPago(
            "open_payments_fallo",
            "El consentimiento apunta a otro dominio",
          );
        }
        return {
          redirectUrl,
          continueUri: grant.continue.uri,
          continueToken: grant.continue.access_token.value,
          nonceAs: grant.interact.finish,
        };
      }),

    completarConsentimiento: ({
      pagador,
      cotizacion,
      continueUri,
      continueToken,
      interactRef,
    }) =>
      conSdk("completar consentimiento", async () => {
        const open = await cliente();
        const grant = await open.grant.continue(
          { url: validarUrlServidor(continueUri), accessToken: continueToken },
          { interact_ref: interactRef },
        );
        if (!isFinalizedGrantWithAccessToken(grant)) {
          throw new ErrorPago(
            "consentimiento_rechazado",
            "El pagador no aprobó el permiso",
          );
        }
        const outgoing = await open.outgoingPayment.create(
          {
            url: validarUrlServidor(pagador.resourceServer),
            accessToken: grant.access_token.value,
          },
          { walletAddress: pagador.url, quoteId: cotizacion.quoteUrl },
        );
        return { outgoingPaymentUrl: outgoing.id };
      }),

    consultarRecibido: ({ incomingPaymentUrl, esperado }) =>
      conSdk("consultar incoming payment", async () => {
        const incoming = await (
          await clientePublico()
        ).incomingPayment.get({
          url: incomingPaymentUrl,
        });
        const recibido = incoming.receivedAmount
          ? aMonto(incoming.receivedAmount)
          : { valor: "0", codigo: esperado.codigo, escala: esperado.escala };
        return {
          recibido,
          completo: BigInt(recibido.valor) >= BigInt(esperado.valor),
        };
      }),
  };
}
