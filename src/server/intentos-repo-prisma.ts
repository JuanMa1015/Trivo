import type { PrismaClient } from "@/generated/prisma/client";
import type { Intento, RepoIntentos } from "./tipos";

type Fila = Awaited<
  ReturnType<PrismaClient["intentoPago"]["findUniqueOrThrow"]>
>;

function aIntento(f: Fila): Intento {
  return {
    id: f.id,
    cobroId: f.cobroId,
    walletPagador: f.walletPagador,
    nombrePagador: f.nombrePagador,
    quoteUrl: f.quoteUrl,
    debito: {
      valor: f.debitoValor,
      codigo: f.debitoCodigo,
      escala: f.debitoEscala,
    },
    recibe: {
      valor: f.recibeValor,
      codigo: f.recibeCodigo,
      escala: f.recibeEscala,
    },
    venceEn: f.venceEn.toISOString(),
    ...(f.continueUri && f.continueToken && f.nonceCliente && f.nonceAs
      ? {
          continuacion: {
            continueUri: f.continueUri,
            continueToken: f.continueToken,
            nonceCliente: f.nonceCliente,
            nonceAs: f.nonceAs,
          },
        }
      : {}),
  };
}

export function crearRepoIntentosPrisma(
  obtenerPrisma: () => PrismaClient,
): RepoIntentos {
  return {
    async crear(n) {
      const fila = await obtenerPrisma().intentoPago.create({
        data: {
          cobroId: n.cobroId,
          walletPagador: n.walletPagador,
          nombrePagador: n.nombrePagador,
          quoteUrl: n.quoteUrl,
          debitoValor: n.debito.valor,
          debitoCodigo: n.debito.codigo,
          debitoEscala: n.debito.escala,
          recibeValor: n.recibe.valor,
          recibeCodigo: n.recibe.codigo,
          recibeEscala: n.recibe.escala,
          venceEn: new Date(n.venceEn),
        },
      });
      return aIntento(fila);
    },

    async obtener(id) {
      const fila = await obtenerPrisma().intentoPago.findUnique({
        where: { id },
      });
      return fila ? aIntento(fila) : undefined;
    },

    async guardarContinuacion(id, c) {
      await obtenerPrisma().intentoPago.update({
        where: { id },
        data: {
          continueUri: c.continueUri,
          continueToken: c.continueToken,
          nonceCliente: c.nonceCliente,
          nonceAs: c.nonceAs,
        },
      });
    },
  };
}
