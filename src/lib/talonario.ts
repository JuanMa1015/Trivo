import { z } from "zod";

export const reciboSchema = z.object({
  numero: z.number().int().positive(),
  monto: z.number().int().positive(),
  concepto: z.string(),
  codigo: z.string().regex(/^\d{6}$/),
  estado: z.enum(["esperando", "cobrado", "vencido"]),
  hora: z.string(),
});

export type Recibo = z.infer<typeof reciboSchema>;
export type Estado = Recibo["estado"];

export const COMERCIO_EJEMPLO = "Almacén El Centro";
export const CONCEPTOS = ["Ropa", "Comida", "Servicio", "Otro"] as const;
export const MAX_DIGITOS = 9;

// Datos de ejemplo hasta conectar el backend. Marcados como demo en la interfaz.
export const RECIBOS_EJEMPLO: Recibo[] = [
  {
    numero: 42,
    monto: 35_000,
    concepto: "Ropa",
    codigo: "390214",
    estado: "cobrado",
    hora: "10:42",
  },
  {
    numero: 41,
    monto: 120_000,
    concepto: "Servicio",
    codigo: "118742",
    estado: "cobrado",
    hora: "09:58",
  },
  {
    numero: 40,
    monto: 18_000,
    concepto: "Comida",
    codigo: "602731",
    estado: "vencido",
    hora: "09:15",
  },
];

export function siguienteNumero(recibos: readonly Recibo[]): number {
  return recibos.reduce((max, r) => Math.max(max, r.numero), 0) + 1;
}

export function totalCobrado(recibos: readonly Recibo[]): number {
  return recibos
    .filter((r) => r.estado === "cobrado")
    .reduce((suma, r) => suma + r.monto, 0);
}

/** Código de 6 dígitos de un solo uso. En producción se genera y guarda en el servidor. */
export function generarCodigo(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 1_000_000).padStart(6, "0");
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

export function horaActual(fecha: Date = new Date()): string {
  return fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
