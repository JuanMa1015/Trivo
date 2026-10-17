export type Lang = "es" | "en";

export const textos = {
  es: {
    pagarTitulo: "Pagar con código",
    pagarAyuda: "Escribe el código de 6 dígitos que te dio el vendedor.",
    codigo: "Código",
    continuar: "Continuar",
    teCobra: "te cobra",
    pagasA: "Pagas a",
    tuPagas: "Tú pagas",
    desde: "Desde",
    tasa: "Tasa",
    precioValido: "Precio válido por",
    venceEn: "Vence en",
    tuWallet: "Tu wallet address",
    walletAyuda: "Empieza con https://",
    walletError: "Escribe una dirección que empiece con https://",
    verPrecio: "Ver precio",
    calculando: "Calculando tu precio…",
    cambiarWallet: "Usar otra wallet",
    aprobar: "Aprobar en mi wallet",
    seguridad:
      "El dinero solo se mueve cuando tú lo apruebas en tu wallet, no en esta página.",
    llevando: "Te llevamos a tu wallet…",
    yendo: "Procesando tu pago",
    yendoAyuda: "No cierres esta pantalla. Te avisamos cuando termine.",
    vencido: "Este cobro venció",
    vencidoAyuda: "Pídele al vendedor que cree uno nuevo.",
    fallido: "Tu wallet no pudo completar el pago",
    fallidoAyuda:
      "Revisa que tengas saldo suficiente en tu wallet. No se cobró este pago: pídele al vendedor que cree un cobro nuevo e inténtalo de nuevo. Si ves el cargo en tu wallet, no repitas el pago y avísale.",
    exito: "Pago enviado",
    exitoAyuda: "El vendedor ya recibió su recibo.",
    confirmaNombre:
      "Confirma que este es el nombre de quien te cobra, antes de aprobar.",
    codigoConfirmacion: "Código de confirmación",
    confirmacionAyuda:
      "El vendedor ve el mismo código en su pantalla. Si no coincide, no des por pagado nada y avísale.",
    error_cobro_ya_pagado: "Este cobro ya fue pagado.",
    nuevoPago: "Hacer otro pago",
    codigoNoEncontrado: "No encontramos ese código",
    codigoNoEncontradoAyuda:
      "Revisa los 6 dígitos o pídele al vendedor que te lo repita.",
    otroCodigo: "Escribir otro código",
    error_generico: "Algo salió mal. Intenta de nuevo.",
    error_red: "No pudimos conectar. Revisa tu internet e intenta de nuevo.",
    error_wallet_invalida: "Esa wallet address no es válida.",
    error_wallet_no_permitida: "Todavía no aceptamos pagos desde esa wallet.",
    error_moneda_no_soportada: "Esa moneda todavía no está disponible.",
    error_cobro_no_disponible: "Este cobro ya no está disponible.",
    error_cotizacion_vencida: "El precio venció. Pide uno nuevo.",
    error_intento_no_encontrado:
      "Esa solicitud ya no existe. Empieza de nuevo.",
    error_retorno_invalido:
      "No pudimos confirmar tu aprobación. Intenta de nuevo.",
    error_consentimiento_rechazado: "No aprobaste el pago en tu wallet.",
    error_open_payments_fallo:
      "Tu wallet no respondió como esperábamos. Intenta de nuevo.",
    error_demasiadas_solicitudes: "Demasiados intentos. Espera un momento.",
  },
  en: {
    pagarTitulo: "Pay with a code",
    pagarAyuda: "Enter the 6-digit code the seller gave you.",
    codigo: "Code",
    continuar: "Continue",
    teCobra: "is charging you",
    pagasA: "You pay",
    tuPagas: "You pay",
    desde: "From",
    tasa: "Rate",
    precioValido: "Price valid for",
    venceEn: "Expires in",
    tuWallet: "Your wallet address",
    walletAyuda: "Starts with https://",
    walletError: "Enter an address that starts with https://",
    verPrecio: "See price",
    calculando: "Working out your price…",
    cambiarWallet: "Use another wallet",
    aprobar: "Approve in my wallet",
    seguridad:
      "Money only moves when you approve it in your wallet, not on this page.",
    llevando: "Taking you to your wallet…",
    yendo: "Processing your payment",
    yendoAyuda: "Don't close this screen. We'll let you know when it's done.",
    vencido: "This charge has expired",
    vencidoAyuda: "Ask the seller to create a new one.",
    fallido: "Your wallet could not complete the payment",
    fallidoAyuda:
      "Check that your wallet has enough balance. This payment was not completed: ask the seller to create a new charge and try again. If you see the charge in your wallet, do not pay again and tell the seller.",
    exito: "Payment sent",
    exitoAyuda: "The seller already got their receipt.",
    confirmaNombre:
      "Check that this is the name of who is charging you before approving.",
    codigoConfirmacion: "Confirmation code",
    confirmacionAyuda:
      "The seller sees the same code on their screen. If it doesn't match, don't consider anything paid and tell them.",
    error_cobro_ya_pagado: "This charge was already paid.",
    nuevoPago: "Make another payment",
    codigoNoEncontrado: "We couldn't find that code",
    codigoNoEncontradoAyuda:
      "Check the 6 digits or ask the seller to repeat it.",
    otroCodigo: "Enter another code",
    error_generico: "Something went wrong. Please try again.",
    error_red: "We couldn't connect. Check your internet and try again.",
    error_wallet_invalida: "That wallet address is not valid.",
    error_wallet_no_permitida: "We don't accept payments from that wallet yet.",
    error_moneda_no_soportada: "That currency isn't available yet.",
    error_cobro_no_disponible: "This charge is no longer available.",
    error_cotizacion_vencida: "The price expired. Ask for a new one.",
    error_intento_no_encontrado: "That request no longer exists. Start again.",
    error_retorno_invalido:
      "We couldn't confirm your approval. Please try again.",
    error_consentimiento_rechazado:
      "You didn't approve the payment in your wallet.",
    error_open_payments_fallo:
      "Your wallet didn't respond as expected. Please try again.",
    error_demasiadas_solicitudes: "Too many attempts. Please wait a moment.",
  },
} as const satisfies Record<Lang, Record<string, string>>;

type Textos = (typeof textos)[Lang];

/** Mensaje para un código de error de la API; si no lo conocemos, uno genérico. */
export function textoDeError(
  t: Textos,
  codigo: string | null | undefined,
): string {
  const clave = `error_${codigo}` as keyof Textos;
  return clave in t ? t[clave] : t.error_generico;
}
