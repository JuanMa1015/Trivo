import type {
  Cobro,
  CobroResumen,
  PagoPublico,
  TipoEvento,
} from "@/lib/cobros";

export type ResultadoPago =
  | { ok: true; estado: Cobro["estado"] }
  | { ok: false; motivo: "no_encontrado" }
  | { ok: false; motivo: "no_disponible"; estado: Cobro["estado"] };

/**
 * Contrato único del almacén de cobros. Lo cumplen la versión en memoria
 * (demo y tests) y la de Postgres. Cada cambio de estado deja un evento.
 */
export type RepoCobros = {
  crear(monto: number, concepto: string): Promise<Cobro>;
  listar(): Promise<CobroResumen[]>;
  obtener(numero: number): Promise<Cobro | undefined>;
  registrarDelCliente(numero: number, tipo: TipoEvento): Promise<boolean>;
  verComoPagador(codigo: string): Promise<PagoPublico | undefined>;
  aprobarComoPagador(codigo: string, wallet: string): Promise<ResultadoPago>;
  simularPago(numero: number): Promise<ResultadoPago>;
};
