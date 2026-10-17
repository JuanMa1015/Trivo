import type { Monto } from "@/lib/cobros";

/** Lo que el servidor necesita saber de una wallet address de Open Payments. */
export type DatosWallet = {
  url: string;
  /** Nombre público que declara la wallet; puede no existir. */
  nombre: string | null;
  codigo: string;
  escala: number;
  authServer: string;
  resourceServer: string;
};

export type Cotizacion = {
  quoteUrl: string;
  debito: Monto;
  recibe: Monto;
  /** Después de esta hora el precio ya no vale. */
  venceEn: string;
};

export type InicioConsentimiento = {
  /** A dónde mandar el navegador del pagador para que apruebe en su wallet. */
  redirectUrl: string;
  continueUri: string;
  continueToken: string;
  /** Nonce del servidor de autorización; sirve para verificar el hash del retorno. */
  nonceAs: string;
};

/**
 * Frontera con Open Payments. La implementación real usa el SDK oficial; en
 * los tests se reemplaza por una falsa. Todo lo que entra por aquí ya viene
 * validado (URLs https y hosts permitidos).
 */
export type PuertoOpenPayments = {
  leerWallet(url: string): Promise<DatosWallet>;

  /** Pasos 1 y 2: incoming payment en la wallet receptora, con monto fijo y vencimiento. */
  crearCobro(args: {
    receptora: DatosWallet;
    monto: Monto;
    venceEn: Date;
  }): Promise<{ incomingPaymentUrl: string }>;

  /** Pasos 3 y 4: cuánto costará pagar ese incoming payment desde la wallet del pagador. */
  cotizar(args: {
    pagador: DatosWallet;
    incomingPaymentUrl: string;
  }): Promise<Cotizacion>;

  /** Paso 5: grant interactivo de outgoing payment, limitado al débito cotizado. */
  iniciarConsentimiento(args: {
    pagador: DatosWallet;
    cotizacion: Cotizacion;
    retornoUri: string;
    nonceCliente: string;
  }): Promise<InicioConsentimiento>;

  /** Pasos 6 y 7: continúa el grant ya aprobado y crea el outgoing payment. */
  completarConsentimiento(args: {
    pagador: DatosWallet;
    cotizacion: Cotizacion;
    continueUri: string;
    continueToken: string;
    interactRef: string;
  }): Promise<{ outgoingPaymentUrl: string; accessToken: string }>;

  /** ¿La wallet del pagador marcó su pago saliente como fallido? */
  consultarPagoSaliente(args: {
    outgoingPaymentUrl: string;
    accessToken: string;
  }): Promise<{ fallido: boolean }>;

  /** Paso 8: ¿ya llegó todo el dinero al incoming payment? */
  consultarRecibido(args: {
    incomingPaymentUrl: string;
    esperado: Monto;
  }): Promise<{ recibido: Monto; completo: boolean }>;
};
