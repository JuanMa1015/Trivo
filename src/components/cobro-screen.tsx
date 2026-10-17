"use client";

import { useRouter } from "next/navigation";
import { useCobroEnVivo } from "@/components/cobro/use-cobro-en-vivo";
import { EscritorioCobro } from "@/components/web/escritorio-cobro";

/**
 * Un cobro (/cobro/[id]): sondeo cada segundo, aviso al cobrar, copiar y simular viven en
 * `useCobroEnVivo`. Tras simular el pago (~5 s, solo en demo) vuelve al inicio. La pantalla
 * es la misma en el celular y en el computador.
 */
export function CobroScreen({ id }: { id: string }) {
  const router = useRouter();
  const vivo = useCobroEnVivo(id, () => router.push("/"));
  return (
    <EscritorioCobro
      vivo={vivo}
      noEncontrado={vivo.estado === "no_encontrado"}
    />
  );
}
