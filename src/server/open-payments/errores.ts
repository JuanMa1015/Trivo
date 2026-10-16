export type CodigoError =
  | "wallet_invalida"
  | "wallet_no_permitida"
  | "moneda_no_soportada"
  | "cobro_no_disponible"
  | "cotizacion_vencida"
  | "intento_no_encontrado"
  | "retorno_invalido"
  | "consentimiento_rechazado"
  | "open_payments_fallo";

/** Error esperado del flujo de pago: lleva un código estable para la interfaz y los logs. */
export class ErrorPago extends Error {
  constructor(
    readonly codigo: CodigoError,
    mensaje?: string,
    options?: { cause?: unknown },
  ) {
    super(mensaje ?? codigo, options);
    this.name = "ErrorPago";
  }
}
