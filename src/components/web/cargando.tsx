"use client";

import { IconEscudo } from "@/components/icons";
import { DosColumnasWeb, PantallaWeb } from "@/components/web/contenedor";
import { heroCobrar } from "@/components/web/escritorio-cobrar";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { montoAnunciado } from "@/components/web/monto-en-camino";
import { NavComercio, NavPagador } from "@/components/web/nav-web";
import { PanelCobrarWeb } from "@/components/web/panel-cobrar";
import { TarjetaCobroVacia } from "@/components/web/tarjeta-cobro";
import { textos } from "@/lib/i18n";
import { usePerfil } from "@/lib/use-perfil";

/*
 * Mientras una ruta dinámica llega del servidor, Next muestra el `fallback` de su
 * Suspense. En escritorio, en vez de una pantalla vacía, se muestra la misma
 * composición de la pantalla que viene: así la transición es continua.
 * Por debajo de lg no se ve nada, como antes.
 */

/** /cobro/[id] cargando: hero de Cobrar, teclado atenuado y código de pago vacío. */
export function CobroCargando() {
  const { comercio } = usePerfil();
  const enCamino = montoAnunciado();
  return (
    <PantallaWeb
      nav={<NavComercio seccion="cobrar" />}
      hero={heroCobrar(enCamino !== null ? pesosWeb(enCamino) : "…", {
        comercio,
      })}
    >
      <DosColumnasWeb>
        <PanelCobrarWeb monto={0} concepto="" inactivo />
        <TarjetaCobroVacia />
      </DosColumnasWeb>
    </PantallaWeb>
  );
}

/** /p/[token] cargando: barra y hero del pagador. */
export function PagoCargando() {
  return (
    <PantallaWeb
      nav={<NavPagador lang="es" onLang={() => {}} />}
      hero={
        <HeroWeb
          insignia="Open Payments"
          IconoInsignia={IconEscudo}
          titulo={textos.es.pagarTitulo}
        />
      }
    >
      <div className="tarjeta-web mx-auto h-64 w-full max-w-140" />
    </PantallaWeb>
  );
}
