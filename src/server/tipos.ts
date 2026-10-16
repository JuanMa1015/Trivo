import type { Cobro, CobroResumen, Monto, TipoEvento } from "@/lib/cobros";

export type ResultadoPago =
  | { ok: true; estado: Cobro["estado"] }
  | { ok: false; motivo: "no_encontrado" }
  | { ok: false; motivo: "no_disponible"; estado: Cobro["estado"] };

/**
 * Contrato único del almacén de cobros. Lo cumplen la versión en memoria
 * (demo y tests) y la de Postgres. Cada cambio de estado deja un evento.
 */
export type RepoCobros = {
  crear(
    monto: number,
    concepto: string,
    extra?: { incomingPaymentUrl?: string },
  ): Promise<Cobro>;
  listar(): Promise<CobroResumen[]>;
  obtener(numero: number): Promise<Cobro | undefined>;
  /** Solo para resolver el código de 6 dígitos a su token; nunca para pagar. */
  obtenerPorCodigo(codigo: string): Promise<Cobro | undefined>;
  /** El pagador llega siempre por el token del link o del QR. */
  obtenerPorToken(token: string): Promise<Cobro | undefined>;
  obtenerPorId(id: string): Promise<Cobro | undefined>;
  registrar(
    numero: number,
    tipo: TipoEvento,
    detalle?: string,
  ): Promise<boolean>;
  /** Primera apertura del pagador: se registra una sola vez. */
  registrarApertura(token: string): Promise<void>;

  /** Modo demo: pasa a procesando y se confirma solo a los 5 s. */
  iniciarPagoDemo(numero: number, detalle: string): Promise<ResultadoPago>;

  /** Open Payments real: el pago salió de la wallet del pagador. */
  marcarProcesando(
    numero: number,
    outgoingPaymentUrl: string,
  ): Promise<boolean>;
  /** Open Payments real: el dinero llegó. Solo desde esperando o procesando. */
  marcarCobrado(numero: number, detalle: string): Promise<boolean>;
  /** Open Payments real: el pago enviado no llegó. Solo desde procesando. */
  marcarFallido(numero: number, detalle: string): Promise<boolean>;
  listarProcesando(): Promise<Cobro[]>;
};

export type OpcionesRepo = {
  /** Confirma solo, a los 5 s, los pagos de demo. Apagado con Open Payments real. */
  completarDemo: boolean;
  /** Cobros de ejemplo al arrancar (solo memoria). Apagado con Open Payments real. */
  semilla: boolean;
};

export type Intento = {
  id: string;
  cobroId: string;
  walletPagador: string;
  nombrePagador: string | null;
  quoteUrl: string;
  debito: Monto;
  recibe: Monto;
  venceEn: string;
  continuacion?: Continuacion;
};

/** Lo que hace falta para seguir el grant interactivo cuando el pagador regresa. */
export type Continuacion = {
  continueUri: string;
  continueToken: string;
  nonceCliente: string;
  nonceAs: string;
};

export type NuevoIntento = Omit<Intento, "id" | "continuacion">;

/** Intentos de pago: una cotización por vez que el pagador pone su wallet. */
export type RepoIntentos = {
  crear(nuevo: NuevoIntento): Promise<Intento>;
  obtener(id: string): Promise<Intento | undefined>;
  guardarContinuacion(id: string, continuacion: Continuacion): Promise<void>;
};
