/*
 * Puente visual entre Cobrar y el cobro recién creado (solo presentación).
 * Al cobrar, Cobrar limpia el teclado y navega a /cobro/[numero], que tarda un
 * instante en leer el cobro. Mientras tanto el banner mostraría $0 y luego nada;
 * con este valor ambos banners siguen mostrando el monto y la transición es continua.
 * El dato real siempre llega por el sondeo del cobro, que lo reemplaza.
 */
let montoEnCamino: number | null = null;

export function anunciarMonto(monto: number) {
  montoEnCamino = monto;
}

export function montoAnunciado(): number | null {
  return montoEnCamino;
}

export function olvidarMonto() {
  montoEnCamino = null;
}
