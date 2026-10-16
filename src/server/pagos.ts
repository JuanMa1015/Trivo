import { randomUUID } from "node:crypto";
import { TASA_EJEMPLO_COP_POR_USD } from "@/lib/conversion";
import {
  PAGO_SIN_CONFIRMAR_MS,
  VENCE_EN_MS,
  type Cobro,
  type CobroResumen,
  type CotizacionPublica,
  type Estado,
  type Monto,
  type PagoPublico,
  type TipoEvento,
} from "@/lib/cobros";
import { codigoConfirmacion, secretoConfirmacion } from "./confirmacion";
import type { ConfigOpenPayments } from "./open-payments/config";
import { ErrorPago, type CodigoError } from "./open-payments/errores";
import type { DatosWallet, PuertoOpenPayments } from "./open-payments/puerto";
import {
  validarUrlWallet,
  verificarHashInteraccion,
} from "./open-payments/seguridad";
import type { Intento, RepoCobros, RepoIntentos, ResultadoPago } from "./tipos";

export type RespuestaAprobacion = { redirect: string } | { estado: Estado };

export type Retorno = { interactRef?: string; hash?: string };

/**
 * Lo que la API de Trivo hace con los pagos. Dos versiones con la misma forma:
 * la de demo (pago simulado) y la de Open Payments real.
 *
 * El pagador siempre llega por el `token` del link o del QR (128 bits). El
 * código de 6 dígitos solo sirve para encontrar ese token, nunca para pagar.
 */
export type ServicioPagos = {
  modo: "demo" | "open-payments";
  crearCobro(monto: number, concepto: string): Promise<Cobro>;
  listar(): Promise<CobroResumen[]>;
  obtener(numero: number): Promise<Cobro | undefined>;
  registrarEvento(numero: number, tipo: TipoEvento): Promise<boolean>;
  /** Solo demo. */
  simularPago(numero: number): Promise<ResultadoPago>;
  /** Del código de 6 dígitos al token; nulo si no existe. */
  resolverCodigo(codigo: string): Promise<string | undefined>;
  verComoPagador(token: string): Promise<PagoPublico | undefined>;
  cotizar(token: string, wallet: string): Promise<CotizacionPublica>;
  aprobar(token: string, intentoId: string): Promise<RespuestaAprobacion>;
  /** Open Payments: el navegador del pagador regresa de su wallet. */
  completarRetorno(
    intentoId: string,
    retorno: Retorno,
  ): Promise<{ token?: string; error?: CodigoError }>;
};

type Deps = {
  repo: RepoCobros;
  intentos: RepoIntentos;
  ahora?: () => number;
  /** Secreto con el que se firma el código de confirmación. */
  secreto?: () => string;
};

const COTIZACION_MS = 5 * 60 * 1000;
const CACHE_WALLET_MS = 10 * 60 * 1000;
const MIN_ENTRE_CONCILIACIONES_MS = 1_000;

const hostDe = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** Valida que el intento sea de ese cobro, no haya vencido y el cobro siga esperando. */
function comprobarIntento(
  intento: Intento | undefined,
  cobro: Cobro | undefined,
  ahora: number,
): asserts intento is Intento {
  if (!intento || !cobro || intento.cobroId !== cobro.id) {
    throw new ErrorPago("intento_no_encontrado");
  }
  if (cobro.estado !== "esperando") throw new ErrorPago("cobro_no_disponible");
  if (Date.parse(intento.venceEn) <= ahora)
    throw new ErrorPago("cotizacion_vencida");
}

/** Añade el código de confirmación cuando (y solo cuando) el dinero ya llegó. */
function firmar<
  T extends { id?: string; monto: number; estado: Estado; pagadoEn?: string },
>(cobro: T, id: string, secreto: () => string): T & { confirmacion?: string } {
  if (cobro.estado !== "cobrado" || !cobro.pagadoEn) return cobro;
  return {
    ...cobro,
    confirmacion: codigoConfirmacion(secreto(), {
      id,
      monto: cobro.monto,
      pagadoEn: cobro.pagadoEn,
    }),
  };
}

// ---------------------------------------------------------------- demo

export function crearServicioDemo({
  repo,
  intentos,
  ahora = Date.now,
  secreto = secretoConfirmacion,
}: Deps): ServicioPagos {
  return {
    modo: "demo",

    crearCobro: (monto, concepto) => repo.crear(monto, concepto),
    listar: () => repo.listar(),
    async obtener(numero) {
      const c = await repo.obtener(numero);
      return c && firmar(c, c.id, secreto);
    },
    registrarEvento: (numero, tipo) => repo.registrar(numero, tipo),
    simularPago: (numero) =>
      repo.iniciarPagoDemo(numero, "simulado por el vendedor (demo)"),

    async resolverCodigo(codigo) {
      return (await repo.obtenerPorCodigo(codigo))?.token;
    },

    async verComoPagador(token) {
      await repo.registrarApertura(token);
      const c = await repo.obtenerPorToken(token);
      if (!c) return undefined;
      const f = firmar(c, c.id, secreto);
      return {
        comercio: c.comercio,
        monto: c.monto,
        concepto: c.concepto,
        estado: c.estado,
        venceEn: c.venceEn,
        receptor: c.comercio,
        receptorWallet: "",
        ...(f.pagadoEn ? { pagadoEn: f.pagadoEn } : {}),
        ...(f.confirmacion ? { confirmacion: f.confirmacion } : {}),
      };
    },

    async cotizar(token, wallet) {
      const walletUrl = validarUrlWallet(wallet);
      const cobro = await repo.obtenerPorToken(token);
      if (!cobro || cobro.estado !== "esperando")
        throw new ErrorPago("cobro_no_disponible");

      // Cotización de ejemplo con la tasa observada en la testnet.
      const debito: Monto = {
        valor: String(
          Math.round((cobro.monto / TASA_EJEMPLO_COP_POR_USD) * 100),
        ),
        codigo: "USD",
        escala: 2,
      };
      const recibe: Monto = {
        valor: String(cobro.monto * 100),
        codigo: "COP",
        escala: 2,
      };
      const venceEn = new Date(ahora() + COTIZACION_MS).toISOString();

      const intento = await intentos.crear({
        cobroId: cobro.id,
        walletPagador: walletUrl,
        nombrePagador: null,
        quoteUrl: "demo://cotizacion",
        debito,
        recibe,
        venceEn,
      });
      await repo.registrar(cobro.numero, "cotizado", hostDe(walletUrl));
      return {
        intentoId: intento.id,
        receptor: cobro.comercio,
        pagador: null,
        debito,
        recibe,
        venceEn,
      };
    },

    async aprobar(token, intentoId) {
      const cobro = await repo.obtenerPorToken(token);
      const intento = await intentos.obtener(intentoId);
      comprobarIntento(intento, cobro, ahora());
      const resultado = await repo.iniciarPagoDemo(
        cobro!.numero,
        `wallet: ${intento.walletPagador}`,
      );
      if (!resultado.ok) throw new ErrorPago("cobro_no_disponible");
      return { estado: "procesando" };
    },

    async completarRetorno() {
      return { error: "retorno_invalido" };
    },
  };
}

// ------------------------------------------------------ Open Payments real

type DepsReal = Deps & {
  puerto: PuertoOpenPayments;
  config: Pick<
    ConfigOpenPayments,
    "receptoraWalletUrl" | "hostsPermitidos" | "appBaseUrl"
  >;
};

export function crearServicioOpenPayments({
  repo,
  intentos,
  puerto,
  config,
  ahora = Date.now,
  secreto = secretoConfirmacion,
}: DepsReal): ServicioPagos {
  let receptoraCache: { datos: DatosWallet; hasta: number } | undefined;
  let conciliacion: { en: number; trabajo: Promise<void> } | undefined;

  async function receptora(): Promise<DatosWallet> {
    if (receptoraCache && receptoraCache.hasta > ahora())
      return receptoraCache.datos;
    const datos = await puerto.leerWallet(config.receptoraWalletUrl);
    if (datos.codigo !== "COP") {
      throw new ErrorPago(
        "moneda_no_soportada",
        "La wallet receptora debe estar en COP",
      );
    }
    receptoraCache = { datos, hasta: ahora() + CACHE_WALLET_MS };
    return datos;
  }

  const esperado = (monto: number, r: DatosWallet): Monto => ({
    valor: String(monto * 10 ** r.escala),
    codigo: r.codigo,
    escala: r.escala,
  });

  /** Confirma los pagos enviados que ya llegaron; da por fallidos los que no llegan. */
  async function conciliarAhora(): Promise<void> {
    const procesando = await repo.listarProcesando();
    if (procesando.length === 0) return;
    const r = await receptora();
    for (const cobro of procesando) {
      if (!cobro.incomingPaymentUrl) continue;
      try {
        const { completo } = await puerto.consultarRecibido({
          incomingPaymentUrl: cobro.incomingPaymentUrl,
          esperado: esperado(cobro.monto, r),
        });
        if (completo) {
          await repo.marcarCobrado(
            cobro.numero,
            "confirmado por Open Payments",
          );
          continue;
        }
        const enviado = cobro.eventos.findLast(
          (e) => e.tipo === "pago_enviado",
        );
        if (
          enviado &&
          ahora() - Date.parse(enviado.en) > PAGO_SIN_CONFIRMAR_MS
        ) {
          await repo.marcarFallido(
            cobro.numero,
            "el dinero no llegó en 3 minutos",
          );
        }
      } catch (error) {
        // Una consulta caída no cambia el estado: se reintenta en la siguiente lectura.
        console.error(
          "open-payments: no se pudo consultar el cobro",
          cobro.numero,
          error,
        );
      }
    }
  }

  /** Una conciliación a la vez y no más de una por segundo, aunque varios clientes sondeen. */
  async function conciliar(): Promise<void> {
    if (
      conciliacion &&
      ahora() - conciliacion.en < MIN_ENTRE_CONCILIACIONES_MS
    ) {
      return conciliacion.trabajo;
    }
    const trabajo = conciliarAhora().catch((error) =>
      console.error("open-payments: conciliación fallida", error),
    );
    conciliacion = { en: ahora(), trabajo };
    return trabajo;
  }

  return {
    modo: "open-payments",

    async crearCobro(monto, concepto) {
      const r = await receptora();
      const { incomingPaymentUrl } = await puerto.crearCobro({
        receptora: r,
        monto: esperado(monto, r),
        venceEn: new Date(ahora() + VENCE_EN_MS),
      });
      return repo.crear(monto, concepto, { incomingPaymentUrl });
    },

    async listar() {
      await conciliar();
      return repo.listar();
    },

    async obtener(numero) {
      await conciliar();
      const c = await repo.obtener(numero);
      return c && firmar(c, c.id, secreto);
    },

    registrarEvento: (numero, tipo) => repo.registrar(numero, tipo),

    async simularPago() {
      return { ok: false, motivo: "no_encontrado" };
    },

    async resolverCodigo(codigo) {
      return (await repo.obtenerPorCodigo(codigo))?.token;
    },

    async verComoPagador(token) {
      await conciliar();
      await repo.registrarApertura(token);
      const c = await repo.obtenerPorToken(token);
      if (!c) return undefined;
      const r = await receptora();
      const f = firmar(c, c.id, secreto);
      return {
        comercio: c.comercio,
        monto: c.monto,
        concepto: c.concepto,
        estado: c.estado,
        venceEn: c.venceEn,
        receptor: r.nombre ?? c.comercio,
        receptorWallet: r.url,
        ...(f.pagadoEn ? { pagadoEn: f.pagadoEn } : {}),
        ...(f.confirmacion ? { confirmacion: f.confirmacion } : {}),
      };
    },

    async cotizar(token, wallet) {
      const walletUrl = validarUrlWallet(wallet, config.hostsPermitidos);
      const cobro = await repo.obtenerPorToken(token);
      if (!cobro || cobro.estado !== "esperando" || !cobro.incomingPaymentUrl) {
        throw new ErrorPago("cobro_no_disponible");
      }

      const [r, pagador] = await Promise.all([
        receptora(),
        puerto.leerWallet(walletUrl),
      ]);
      const cotizacion = await puerto.cotizar({
        pagador,
        incomingPaymentUrl: cobro.incomingPaymentUrl,
      });

      // La wallet cotiza lo que quiere: comprobamos que el cobro sea exactamente el nuestro.
      const quiere = esperado(cobro.monto, r);
      if (
        cotizacion.recibe.codigo !== quiere.codigo ||
        BigInt(cotizacion.recibe.valor) !== BigInt(quiere.valor)
      ) {
        throw new ErrorPago(
          "open_payments_fallo",
          "La cotización no coincide con el cobro",
        );
      }

      const intento = await intentos.crear({
        cobroId: cobro.id,
        walletPagador: pagador.url,
        nombrePagador: pagador.nombre,
        quoteUrl: cotizacion.quoteUrl,
        debito: cotizacion.debito,
        recibe: cotizacion.recibe,
        venceEn: cotizacion.venceEn,
      });
      await repo.registrar(
        cobro.numero,
        "cotizado",
        pagador.nombre ?? hostDe(pagador.url),
      );

      return {
        intentoId: intento.id,
        receptor: r.nombre ?? cobro.comercio,
        pagador: pagador.nombre,
        debito: cotizacion.debito,
        recibe: cotizacion.recibe,
        venceEn: cotizacion.venceEn,
      };
    },

    async aprobar(token, intentoId) {
      const cobro = await repo.obtenerPorToken(token);
      const intento = await intentos.obtener(intentoId);
      comprobarIntento(intento, cobro, ahora());

      const pagador = await puerto.leerWallet(
        validarUrlWallet(intento.walletPagador, config.hostsPermitidos),
      );
      const nonceCliente = randomUUID();
      const inicio = await puerto.iniciarConsentimiento({
        pagador,
        cotizacion: {
          quoteUrl: intento.quoteUrl,
          debito: intento.debito,
          recibe: intento.recibe,
          venceEn: intento.venceEn,
        },
        retornoUri: `${config.appBaseUrl}/api/pago/retorno?i=${intento.id}`,
        nonceCliente,
      });
      await intentos.guardarContinuacion(intento.id, {
        continueUri: inicio.continueUri,
        continueToken: inicio.continueToken,
        nonceCliente,
        nonceAs: inicio.nonceAs,
      });
      await repo.registrar(
        cobro!.numero,
        "consentimiento_iniciado",
        pagador.nombre ?? hostDe(pagador.url),
      );
      return { redirect: inicio.redirectUrl };
    },

    async completarRetorno(intentoId, { interactRef, hash }) {
      const intento = await intentos.obtener(intentoId);
      const cobro = intento
        ? await repo.obtenerPorId(intento.cobroId)
        : undefined;
      if (!intento || !cobro) return { error: "intento_no_encontrado" };
      const token = cobro.token;

      const fallar = async (error: CodigoError, detalle: string) => {
        await repo.registrar(cobro.numero, "pago_fallido", detalle);
        return { token, error };
      };

      // Sin interact_ref ni hash, el pagador rechazó o canceló en su wallet.
      if (!interactRef || !hash) {
        return fallar(
          "consentimiento_rechazado",
          "el pagador no aprobó en su wallet",
        );
      }
      if (!intento.continuacion)
        return fallar("retorno_invalido", "retorno sin consentimiento previo");

      const pagador = await puerto.leerWallet(
        validarUrlWallet(intento.walletPagador, config.hostsPermitidos),
      );
      const hashValido = verificarHashInteraccion({
        nonceCliente: intento.continuacion.nonceCliente,
        nonceAs: intento.continuacion.nonceAs,
        interactRef,
        authServerUrl: pagador.authServer,
        hash,
      });
      if (!hashValido)
        return fallar("retorno_invalido", "el hash del retorno no coincide");

      // No se envía dinero a un cobro que ya no está esperando ni con un precio vencido.
      if (cobro.estado !== "esperando")
        return { token, error: "cobro_no_disponible" };
      if (Date.parse(intento.venceEn) <= ahora())
        return fallar("cotizacion_vencida", "el precio venció");

      try {
        const { outgoingPaymentUrl } = await puerto.completarConsentimiento({
          pagador,
          cotizacion: {
            quoteUrl: intento.quoteUrl,
            debito: intento.debito,
            recibe: intento.recibe,
            venceEn: intento.venceEn,
          },
          continueUri: intento.continuacion.continueUri,
          continueToken: intento.continuacion.continueToken,
          interactRef,
        });
        await repo.marcarProcesando(cobro.numero, outgoingPaymentUrl);
        return { token };
      } catch (error) {
        const codigoError =
          error instanceof ErrorPago ? error.codigo : "open_payments_fallo";
        return fallar(codigoError, `no se pudo crear el pago (${codigoError})`);
      }
    },
  };
}
