"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PROCESO_DEMO_MS, type Cobro } from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { codigoAgrupado } from "@/lib/talonario";
import { useAhora, usePolling } from "@/lib/use-polling";

/*
 * Lógica de un cobro en vivo, la misma que tenía `CobroScreen`: sondeo cada segundo,
 * aviso al cobrar, copiar el link, simular el pago (demo) y registrar eventos.
 * Vive aparte para que la pantalla del cobro y el detalle del talonario la compartan.
 */

export function registrarEvento(
  id: string,
  tipo: "compartido_whatsapp" | "link_copiado",
) {
  void fetch(`/api/cobros/${id}/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo }),
  });
}

/** Aviso inmediato cuando el dinero llega: vibración y un pitido corto. */
function avisarCobro() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Sin vibración en este dispositivo: el aviso visual basta.
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const volumen = ctx.createGain();
    osc.frequency.value = 880;
    volumen.gain.value = 0.15;
    osc.connect(volumen);
    volumen.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch {
    // El navegador bloqueó el audio: queda el aviso visual.
  }
}

/** Link de pago: lleva el token (128 bits); el código de 6 dígitos solo se dice en voz alta. */
export function enlaceDePago(cobro: Cobro): string {
  return `${window.location.origin}/p/${cobro.token}`;
}

/** Texto para compartir por WhatsApp. */
export function mensajeDeCobro(cobro: Cobro): string {
  const origen = window.location.origin;
  return `${cobro.comercio} te cobra ${formatearPesos(cobro.monto)}. Entra a ${origen}/pagar y escribe el código ${codigoAgrupado(cobro.codigo)}, o abre ${enlaceDePago(cobro)}`;
}

export { pagadorDe } from "@/lib/cobros";

/**
 * @param alTerminarSimulacion Qué hacer cuando el pago simulado termina de cargar
 *   (~5 s). La pantalla del cobro vuelve al inicio, como siempre.
 */
export function useCobroEnVivo(id: string, alTerminarSimulacion?: () => void) {
  // Cada segundo: el vendedor debe ver el dinero llegar casi al instante.
  const { data, estado } = usePolling<{
    cobro: Cobro;
    modo: "demo" | "open-payments";
  }>(`/api/cobros/${id}`, 1000);
  const ahora = useAhora();
  const [copiado, setCopiado] = useState(false);
  const [inicioSimulacion, setInicioSimulacion] = useState<number | null>(null);
  const cobro = data?.cobro;

  // Tras simular el pago: cargar ~5 s y volver cuando el cobro quede cobrado.
  const cobrado = cobro?.estado === "cobrado";
  const terminarSimulacion = useEffectEvent(() => alTerminarSimulacion?.());
  useEffect(() => {
    if (inicioSimulacion === null || !cobrado) return;
    const falta = Math.max(
      0,
      PROCESO_DEMO_MS - (Date.now() - inicioSimulacion),
    );
    const id = setTimeout(() => terminarSimulacion(), falta);
    return () => clearTimeout(id);
  }, [inicioSimulacion, cobrado]);

  // Avisa solo cuando el cobro pasa a cobrado mientras se mira, no al abrir uno ya cobrado.
  const estadoPrevio = useRef<string | undefined>(undefined);
  const estadoActual = cobro?.estado;
  useEffect(() => {
    if (
      estadoActual === "cobrado" &&
      estadoPrevio.current &&
      estadoPrevio.current !== "cobrado"
    ) {
      avisarCobro();
    }
    estadoPrevio.current = estadoActual;
  }, [estadoActual]);

  async function simular() {
    setInicioSimulacion(Date.now());
    const r = await fetch(`/api/cobros/${id}/simular-pago`, {
      method: "POST",
    });
    if (!r.ok) setInicioSimulacion(null);
  }

  async function copiar() {
    if (!cobro) return;
    try {
      await navigator.clipboard.writeText(enlaceDePago(cobro));
      setCopiado(true);
      registrarEvento(id, "link_copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard blocked: the code stays visible to read aloud.
    }
  }

  return {
    estado,
    cobro,
    modo: data?.modo,
    ahora,
    copiado,
    copiar,
    simular,
  };
}

export type CobroEnVivo = ReturnType<typeof useCobroEnVivo>;
