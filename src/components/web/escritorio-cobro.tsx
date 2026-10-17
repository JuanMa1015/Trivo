"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CobroEnVivo } from "@/components/cobro/use-cobro-en-vivo";
import { DosColumnasWeb, PantallaWeb } from "@/components/web/contenedor";
import { heroCobrar } from "@/components/web/escritorio-cobrar";
import { pesosWeb } from "@/components/web/formato";
import { montoAnunciado, olvidarMonto } from "@/components/web/monto-en-camino";
import { NavComercio } from "@/components/web/nav-web";
import { PanelCobrarWeb } from "@/components/web/panel-cobrar";
import { TarjetaCobroWeb } from "@/components/web/tarjeta-cobro";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";

/**
 * El cobro en escritorio: misma barra, hero y columnas que Cobrar, para que se
 * sienta como una sola pantalla. A la izquierda el teclado atenuado y sin
 * interacción; a la derecha el cobro. Todo cabe sin scroll.
 */
export function EscritorioCobro({
  vivo,
  noEncontrado,
}: {
  vivo: CobroEnVivo;
  noEncontrado: boolean;
}) {
  const { cobro } = vivo;

  // Cuando llega el cobro real, el monto de la transición ya no hace falta.
  useEffect(() => {
    if (cobro) olvidarMonto();
  }, [cobro]);

  const enCamino = montoAnunciado();
  const monto = cobro
    ? pesosWeb(cobro.monto)
    : enCamino !== null
      ? pesosWeb(enCamino)
      : "…";

  return (
    <PantallaWeb
      nav={<NavComercio seccion="cobrar" comercio={COMERCIO_EJEMPLO} />}
      hero={heroCobrar(monto, { comercio: cobro?.comercio })}
    >
      <DosColumnasWeb>
        <PanelCobrarWeb monto={0} concepto="" inactivo />
        {noEncontrado ? (
          <section className="tarjeta-web web-escalonado flex flex-col gap-4 p-8">
            <h2 className="text-medio font-bold text-tinta">
              No encontramos este comprobante
            </h2>
            <p className="text-web-sm text-ink/60">
              Puede que el servidor se haya reiniciado. Vuelve al talonario para
              ver tus cobros.
            </p>
            <Link href="/talonario" className="boton-web mt-auto">
              Volver al talonario
            </Link>
          </section>
        ) : (
          <TarjetaCobroWeb vivo={vivo} />
        )}
      </DosColumnasWeb>
    </PantallaWeb>
  );
}
