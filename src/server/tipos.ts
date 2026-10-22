import type { Cobro, CobroResumen, Monto, TipoEvento } from "@/lib/cobros";
import type { Perfil } from "@/lib/perfil";

export type ResultadoPago =
  | { ok: true; estado: Cobro["estado"] }
  | { ok: false; motivo: "no_encontrado" }
  | { ok: false; motivo: "no_disponible"; estado: Cobro["estado"] };

/**
 * Contrato único del almacén de cobros. Lo cumplen la versión en memoria
 * (demo y tests) y la de Postgres. Cada cambio de estado deja un evento.
 */
export type RepoCobros = {
  /** Todo lo del vendedor recibe el id de su comercio primero: nunca ve cobros ajenos. */
  crear(
    comercioId: string,
    monto: number,
    concepto: string,
    extra?: { incomingPaymentUrl?: string; walletReceptora?: string },
  ): Promise<Cobro>;
  listar(comercioId: string): Promise<CobroResumen[]>;
  obtener(comercioId: string, numero: number): Promise<Cobro | undefined>;
  /** Solo para resolver el código de 6 dígitos a su token; nunca para pagar. */
  obtenerPorCodigo(codigo: string): Promise<Cobro | undefined>;
  /** El pagador llega siempre por el token del link o del QR. */
  obtenerPorToken(token: string): Promise<Cobro | undefined>;
  /** Con `comercioId`, solo si el cobro es de ese comercio. */
  obtenerPorId(id: string, comercioId?: string): Promise<Cobro | undefined>;
  registrar(
    comercioId: string,
    numero: number,
    tipo: TipoEvento,
    detalle?: string,
  ): Promise<boolean>;
  /** Primera apertura del pagador: se registra una sola vez. */
  registrarApertura(token: string): Promise<void>;

  /** Modo demo: pasa a procesando y se confirma solo a los 5 s. */
  iniciarPagoDemo(
    comercioId: string,
    numero: number,
    detalle: string,
  ): Promise<ResultadoPago>;

  /** Open Payments real: el pago salió de la wallet del pagador. */
  marcarProcesando(
    comercioId: string,
    numero: number,
    outgoingPaymentUrl: string,
    tokenPago?: string,
  ): Promise<boolean>;
  /** Token del permiso del pagador, mientras el pago sigue en proceso. Nunca sale por la API. */
  tokenDePago(comercioId: string, numero: number): Promise<string | undefined>;
  /** Open Payments real: el dinero llegó. Solo desde esperando o procesando. */
  marcarCobrado(
    comercioId: string,
    numero: number,
    detalle: string,
  ): Promise<boolean>;
  /** Open Payments real: la wallet no completó el pago o no llegó. Solo desde procesando. */
  marcarFallido(
    comercioId: string,
    numero: number,
    detalle: string,
  ): Promise<boolean>;
  listarProcesando(): Promise<Cobro[]>;
  /** Pesos cobrados en un año calendario (hora de Colombia): lo que cuenta para los topes. */
  totalCobradoDelAnio(comercioId: string, anio: number): Promise<number>;
  /** Total y cantidad de cobros cobrados entre dos instantes (ms): `desde` incluido, `hasta` excluido. */
  resumenCobrado(
    comercioId: string,
    desde: number,
    hasta: number,
  ): Promise<{ total: number; cobros: number }>;

  /** Comercio nuevo sin cuenta (invitado): puede cobrar unas pocas veces antes de registrarse. */
  crearInvitado(): Promise<string>;
  /** Cuenta del comercio y cuántos cobros lleva; nulo si ese comercio no existe. */
  perfil(comercioId: string): Promise<Perfil | undefined>;
  /**
   * Crea la cuenta. Con `comercioId` (un invitado) la cuenta se queda con sus cobros; sin él
   * nace un comercio nuevo. El usuario es único sin importar mayúsculas.
   */
  registrarCuenta(datos: {
    comercioId?: string;
    usuario: string;
    comercio: string;
    passwordHash: string;
    wallet: string;
  }): Promise<
    | { ok: true; comercioId: string }
    | { ok: false; motivo: "usuario_en_uso" | "ya_registrado" }
  >;
  /** Para iniciar sesión: el comercio y el hash de ese usuario. */
  cuentaDe(
    usuario: string,
  ): Promise<{ comercioId: string; passwordHash: string } | undefined>;
};

export type OpcionesRepo = {
  /** Confirma solo, a los 5 s, los pagos de demo. Apagado con Open Payments real. */
  completarDemo: boolean;
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
