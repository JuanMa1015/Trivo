export const COMERCIO_EJEMPLO = "Almacén El Centro";
export const CONCEPTOS = ["Ropa", "Comida", "Servicio", "Otro"] as const;
export const MAX_DIGITOS = 9;

export function totalCobrado(
  cobros: readonly { estado: string; monto: number }[],
): number {
  return cobros
    .filter((c) => c.estado === "cobrado")
    .reduce((suma, c) => suma + c.monto, 0);
}

export function codigoAgrupado(codigo: string): string {
  return `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
}

/** Aplica una tecla del teclado numérico al monto en construcción. */
export function aplicarTecla(digitos: string, tecla: string): string {
  if (tecla === "borrar") return digitos.slice(0, -1);
  const siguiente = (digitos + tecla).replace(/^0+/, "");
  return siguiente.length > MAX_DIGITOS ? digitos : siguiente;
}

export function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
