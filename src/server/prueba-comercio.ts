import type { TipoEvento } from "@/lib/cobros";
import type { ServicioPagos } from "./pagos";
import type { RepoCobros } from "./tipos";

/**
 * Solo para pruebas: un comercio nuevo y el repositorio o servicio "atado" a él, para que las
 * pruebas escriban `repo.crear(monto, concepto)` sin repetir el id en cada llamada. El comercio
 * se crea al primer uso (así se arma sin esperar) y se puede compartir entre ambos con `idP`.
 */
export function atado(
  repo: RepoCobros,
  idP: Promise<string> = repo.crearInvitado(),
) {
  return {
    ...repo,
    id: idP,
    crear: async (
      monto: number,
      concepto: string,
      extra?: Parameters<RepoCobros["crear"]>[3],
    ) => repo.crear(await idP, monto, concepto, extra),
    listar: async () => repo.listar(await idP),
    obtener: async (numero: number) => repo.obtener(await idP, numero),
    registrar: async (numero: number, tipo: TipoEvento, detalle?: string) =>
      repo.registrar(await idP, numero, tipo, detalle),
    iniciarPagoDemo: async (numero: number, detalle: string) =>
      repo.iniciarPagoDemo(await idP, numero, detalle),
    marcarProcesando: async (numero: number, url: string, token?: string) =>
      repo.marcarProcesando(await idP, numero, url, token),
    marcarCobrado: async (numero: number, detalle: string) =>
      repo.marcarCobrado(await idP, numero, detalle),
    marcarFallido: async (numero: number, detalle: string) =>
      repo.marcarFallido(await idP, numero, detalle),
    tokenDePago: async (numero: number) => repo.tokenDePago(await idP, numero),
    totalCobradoDelAnio: async (anio: number) =>
      repo.totalCobradoDelAnio(await idP, anio),
    resumenCobrado: async (desde: number, hasta: number) =>
      repo.resumenCobrado(await idP, desde, hasta),
    perfil: async () => repo.perfil(await idP),
  };
}

export function servicioAtado(
  servicio: ServicioPagos,
  idP: Promise<string> = servicio.crearInvitado(),
) {
  return {
    ...servicio,
    id: idP,
    crearCobro: async (monto: number, concepto: string) =>
      servicio.crearCobro(await idP, monto, concepto),
    listar: async () => servicio.listar(await idP),
    obtener: async (numero: number) => servicio.obtener(await idP, numero),
    numeroDe: async (cobroId: string) => servicio.numeroDe(await idP, cobroId),
    ingresosDelAnio: async (anio: number) =>
      servicio.ingresosDelAnio(await idP, anio),
    resumenCobrado: async (desde: number, hasta: number) =>
      servicio.resumenCobrado(await idP, desde, hasta),
    perfil: async () => servicio.perfil(await idP),
    registrarEvento: async (numero: number, tipo: TipoEvento) =>
      servicio.registrarEvento(await idP, numero, tipo),
    simularPago: async (numero: number) =>
      servicio.simularPago(await idP, numero),
  };
}
