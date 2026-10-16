"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EstadoChip } from "@/components/estado-chip";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconSend,
} from "@/components/icons";
import { Qr } from "@/components/qr";
import { Sello } from "@/components/sello";
import { Trazabilidad } from "@/components/trazabilidad";
import {
  PROCESO_DEMO_MS,
  formatearCuentaRegresiva,
  segundosRestantes,
  type Cobro,
} from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { codigoAgrupado, horaDe } from "@/lib/talonario";
import { useAhora, usePolling } from "@/lib/use-polling";

function registrarEvento(
  numero: number,
  tipo: "compartido_whatsapp" | "link_copiado",
) {
  void fetch(`/api/cobros/${numero}/eventos`, {
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

export function CobroScreen({ numero }: { numero: number }) {
  const router = useRouter();
  // Cada segundo: el vendedor debe ver el dinero llegar casi al instante.
  const { data, estado } = usePolling<{
    cobro: Cobro;
    modo: "demo" | "open-payments";
  }>(`/api/cobros/${numero}`, 1000);
  const ahora = useAhora();
  const [copiado, setCopiado] = useState(false);
  const [inicioSimulacion, setInicioSimulacion] = useState<number | null>(null);
  const cobro = data?.cobro;

  // Tras simular el pago: cargar ~5 s y volver al talonario cuando el cobro quede cobrado.
  const cobrado = cobro?.estado === "cobrado";
  useEffect(() => {
    if (inicioSimulacion === null || !cobrado) return;
    const falta = Math.max(
      0,
      PROCESO_DEMO_MS - (Date.now() - inicioSimulacion),
    );
    const id = setTimeout(() => router.push("/"), falta);
    return () => clearTimeout(id);
  }, [inicioSimulacion, cobrado, router]);

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

  if (estado === "no_encontrado") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">No encontramos este recibo</h1>
        <p className="text-secondary/70">
          Puede que el servidor se haya reiniciado. Vuelve al talonario para ver
          tus cobros.
        </p>
        <Link
          href="/"
          className="font-bold text-primary underline underline-offset-4"
        >
          Volver al talonario
        </Link>
      </main>
    );
  }

  if (!cobro) return <main className="flex-1" />;

  const origen = window.location.origin;
  // El link y el QR llevan el token (128 bits); el código de 6 dígitos solo se dice en voz alta.
  const enlace = `${origen}/p/${cobro.token}`;
  const pagador = cobro.eventos.findLast(
    (e) => e.tipo === "cotizado" || e.tipo === "consentimiento_iniciado",
  )?.detalle;
  const mensaje = `${cobro.comercio} te cobra ${formatearPesos(cobro.monto)}. Entra a ${origen}/pagar y escribe el código ${codigoAgrupado(cobro.codigo)}, o abre ${enlace}`;
  const procesando = cobro.estado === "procesando";
  const esperando = cobro.estado === "esperando";
  const vencido = cobro.estado === "vencido";
  const restante = segundosRestantes(cobro.venceEn, ahora);

  async function simular() {
    setInicioSimulacion(Date.now());
    const r = await fetch(`/api/cobros/${numero}/simular-pago`, {
      method: "POST",
    });
    if (!r.ok) setInicioSimulacion(null);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      registrarEvento(numero, "link_copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard blocked: the code stays visible to read aloud.
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4">
      <Link
        href="/"
        className="flex h-11 w-fit items-center gap-2 font-bold text-primary"
      >
        <IconArrowLeft width={22} height={22} /> Talonario
      </Link>

      <article className="recibo">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-5xl font-bold leading-none tracking-tight">
              {formatearPesos(cobro.monto)}
            </p>
            <span className="shrink-0 pt-1 text-sm font-bold text-secondary/70">
              N.º {String(cobro.numero).padStart(4, "0")}
            </span>
          </div>
          <p className="mt-2 text-secondary/70">
            {cobro.concepto || "Sin concepto"} · {horaDe(cobro.creadoEn)}
          </p>
        </div>

        <div className="perforacion" />

        <div className="anim-rasgar p-5">
          {esperando ? (
            <>
              <p className="text-sm font-bold text-secondary/70">
                Dile este código a quien te paga
              </p>
              <p className="mt-1 text-6xl font-bold tracking-[0.06em] text-primary">
                {codigoAgrupado(cobro.codigo)}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <Qr
                  texto={enlace}
                  etiqueta={`QR para pagar ${formatearPesos(cobro.monto)}`}
                />
                <p className="text-sm text-secondary/70">
                  O que escanee este QR con la cámara.
                </p>
              </div>
            </>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <EstadoChip estado={cobro.estado} />
            {esperando ? (
              <span className="text-sm text-secondary/70">
                Vence en{" "}
                <strong className="text-secondary">
                  {formatearCuentaRegresiva(restante)}
                </strong>
              </span>
            ) : null}
            {procesando ? (
              <span className="anim-latido text-sm text-secondary/70">
                Confirmando el pago…
              </span>
            ) : null}
            {vencido ? (
              <span className="text-sm text-secondary/70">
                Venció a las {horaDe(cobro.venceEn)}. Crea uno nuevo.
              </span>
            ) : null}
          </div>

          {pagador && !cobrado ? (
            <p className="mt-3 text-sm text-secondary/70">
              Quien paga:{" "}
              <strong className="break-all text-secondary">{pagador}</strong>
            </p>
          ) : null}

          {procesando ? (
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-neutral"
              role="progressbar"
              aria-label="Confirmando el pago"
            >
              <div className="anim-progreso h-full rounded-full bg-primary" />
            </div>
          ) : null}

          {cobrado ? (
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Sello texto="Cobrado" />
                <p className="text-sm text-secondary/70">
                  Se sumó a tu historial. Factura generada (demo).
                </p>
              </div>
              {cobro.confirmacion ? (
                <div className="rounded-2xl bg-neutral p-4">
                  <p className="text-sm font-bold text-secondary/70">
                    Código de confirmación
                  </p>
                  <p className="mt-1 text-5xl font-bold tracking-[0.12em] text-primary">
                    {cobro.confirmacion}
                  </p>
                  <p className="mt-2 text-sm text-secondary/80">
                    El cliente debe ver el mismo código en su pantalla. Si es
                    distinto, no entregues nada todavía.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {esperando ? (
        <div className="flex flex-col gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registrarEvento(numero, "compartido_whatsapp")}
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
          >
            <IconSend width={24} height={24} /> Enviar por WhatsApp
          </a>
          <button
            type="button"
            onClick={copiar}
            className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-white text-lg font-bold shadow-sm active:scale-[0.98]"
          >
            {copiado ? (
              <IconCheck width={22} height={22} />
            ) : (
              <IconCopy width={22} height={22} />
            )}
            {copiado ? "Link copiado" : "Copiar link de pago"}
          </button>
          {data?.modo === "demo" ? (
            <button
              type="button"
              onClick={simular}
              className="h-12 rounded-2xl border border-secondary/25 text-sm font-bold text-secondary/80"
            >
              Simular que ya pagó (demo)
            </button>
          ) : null}
        </div>
      ) : null}

      {cobrado || vencido ? (
        <Link
          href="/"
          className="flex h-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
        >
          Nuevo cobro
        </Link>
      ) : null}

      <Trazabilidad eventos={cobro.eventos} />
    </main>
  );
}
