/*
 * "Cobrar de nuevo" (solo presentación): el cobro vencido o fallido deja aquí su monto y
 * su concepto, y Cobrar los recibe al aparecer para que el vendedor no los vuelva a
 * escribir. El cobro nuevo se crea igual que siempre, cuando el vendedor toca "Cobrar".
 */
export type CobroARepetir = { monto: number; concepto: string };

let pendiente: CobroARepetir | null = null;
let entregar: ((cobro: CobroARepetir) => void) | null = null;

function entregarPendiente() {
  if (!pendiente || !entregar) return;
  const cobro = pendiente;
  pendiente = null;
  entregar(cobro);
}

export function repetirCobro(cobro: CobroARepetir) {
  pendiente = { monto: cobro.monto, concepto: cobro.concepto };
  entregarPendiente();
}

/**
 * Cobrar escucha mientras se ve. Si ya hay un cobro esperando, lo recibe enseguida
 * (una sola vez). Devuelve cómo dejar de escuchar.
 */
export function alRepetirCobro(fn: (cobro: CobroARepetir) => void) {
  entregar = fn;
  queueMicrotask(entregarPendiente);
  return () => {
    if (entregar === fn) entregar = null;
  };
}
