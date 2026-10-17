"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconLapiz, IconWallet } from "@/components/icons";
import {
  AvisoWeb,
  DosColumnasWeb,
  PantallaWeb,
} from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { anunciarMonto } from "@/components/web/monto-en-camino";
import { NavComercio } from "@/components/web/nav-web";
import { PanelCobrarWeb } from "@/components/web/panel-cobrar";
import { TarjetaCobroVacia } from "@/components/web/tarjeta-cobro";
import { COMERCIO_EJEMPLO } from "@/lib/talonario";
import { usePerfil } from "@/lib/use-perfil";

/** Hero de la sección Cobrar (lo comparten Cobrar y el cobro, para que se sienta una sola pantalla). */
export function heroCobrar(
  monto: string,
  extra?: { enVivo?: boolean; accion?: ReactNode; comercio?: string },
) {
  return (
    <HeroWeb
      insignia="Cobros"
      IconoInsignia={IconWallet}
      titulo="Cobrar es más fácil con Trivo"
      subtitulo="Rápido, seguro y sin complicaciones."
      comercio={extra?.comercio ?? COMERCIO_EJEMPLO}
      tarjeta={{
        rotulo: "Monto a cobrar",
        valor: monto,
        enVivo: extra?.enVivo,
        accion: extra?.accion,
      }}
    />
  );
}

/**
 * Cobrar en escritorio: monto en vivo en el hero; a la izquierda el campo, los
 * conceptos y el teclado; a la derecha el código de pago, que se llena al cobrar.
 * Recibe el estado y los handlers de la pantalla; no tiene lógica de cobro propia.
 */
export function EscritorioCobrar({
  monto,
  concepto,
  creando,
  error,
  onConcepto,
  onTecla,
  onDigitos,
  onCobrar,
}: {
  monto: number;
  concepto: string;
  creando: boolean;
  error: boolean;
  onConcepto: (concepto: string) => void;
  onTecla: (tecla: string) => void;
  onDigitos: (digitos: string) => void;
  onCobrar: () => void;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const { comercio } = usePerfil();
  // Al cobrar, la pantalla limpia el teclado antes de navegar: el hero conserva
  // el monto enviado para que la transición al cobro no pase por $0.
  const [enviado, setEnviado] = useState<number | null>(null);
  useEffect(() => () => setEnviado(null), []);

  const montoHero = monto > 0 || error ? monto : (enviado ?? 0);

  function cobrar() {
    if (monto > 0 && !creando) {
      setEnviado(monto);
      anunciarMonto(monto);
    }
    onCobrar();
  }

  return (
    <PantallaWeb
      nav={<NavComercio seccion="cobrar" />}
      hero={heroCobrar(pesosWeb(montoHero), {
        comercio,
        enVivo: true,
        accion: (
          <button
            type="button"
            onClick={() => campo.current?.focus()}
            aria-label="Escribir el monto"
            className="boton-circular"
          >
            <IconLapiz width={18} height={18} />
          </button>
        ),
      })}
    >
      {error ? (
        <AvisoWeb tono="error">
          No pudimos crear el cobro. Revisa tu conexión e intenta de nuevo.
        </AvisoWeb>
      ) : null}
      <DosColumnasWeb>
        <PanelCobrarWeb
          monto={monto}
          concepto={concepto}
          creando={creando}
          onConcepto={onConcepto}
          onTecla={onTecla}
          onDigitos={onDigitos}
          onCobrar={cobrar}
          campoRef={campo}
        />
        <TarjetaCobroVacia soloEscritorio />
      </DosColumnasWeb>
    </PantallaWeb>
  );
}
