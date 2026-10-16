"use client";

import Link from "next/link";
import { useState } from "react";
import { EstadoChip } from "@/components/estado-chip";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconSend,
} from "@/components/icons";
import { Sello } from "@/components/sello";
import { formatearPesos } from "@/lib/format";
import { COMERCIO_EJEMPLO, codigoAgrupado } from "@/lib/talonario";
import { useTalonario } from "@/lib/talonario-store";

export function CobroScreen({ numero }: { numero: number }) {
  const { recibos, guardar, listo } = useTalonario();
  const [copiado, setCopiado] = useState(false);
  const recibo = recibos.find((r) => r.numero === numero);

  if (!listo) return <main className="flex-1" />;

  if (!recibo) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start gap-4 px-4 py-8">
        <h1 className="text-2xl font-bold">No encontramos este recibo</h1>
        <p className="text-secondary/70">
          Puede que se haya abierto en otra pestaña. Vuelve al talonario para
          ver tus cobros.
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

  const origen = typeof window === "undefined" ? "" : window.location.origin;
  const enlace = `${origen}/p/${recibo.codigo}?m=${recibo.monto}&c=${encodeURIComponent(recibo.concepto)}`;
  const mensaje = `${COMERCIO_EJEMPLO} te cobra ${formatearPesos(recibo.monto)}. Entra a ${origen}/pagar y escribe el código ${codigoAgrupado(recibo.codigo)}.`;
  const cobrado = recibo.estado === "cobrado";

  function marcarCobrado() {
    guardar(
      recibos.map((r) =>
        r.numero === numero ? { ...r, estado: "cobrado" } : r,
      ),
    );
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
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
              {formatearPesos(recibo.monto)}
            </p>
            <span className="shrink-0 pt-1 text-sm font-bold text-secondary/70">
              N.º {String(recibo.numero).padStart(4, "0")}
            </span>
          </div>
          <p className="mt-2 text-secondary/70">
            {recibo.concepto || "Sin concepto"} · {recibo.hora}
          </p>
        </div>

        <div className="perforacion" />

        <div className="anim-rasgar p-5">
          <p className="text-sm font-bold text-secondary/70">
            Dile este código a quien te paga
          </p>
          <p className="mt-1 text-6xl font-bold tracking-[0.06em] text-primary">
            {codigoAgrupado(recibo.codigo)}
          </p>

          {cobrado ? (
            <div className="mt-5 flex items-center gap-4">
              <Sello texto="Cobrado" />
              <p className="text-sm text-secondary/70">
                Se sumó a tu historial. Factura generada (demo).
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <EstadoChip estado={recibo.estado} />
              <span className="anim-latido text-sm text-secondary/70">
                Esperando que pague…
              </span>
            </div>
          )}
        </div>
      </article>

      {cobrado ? (
        <Link
          href="/"
          className="flex h-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
        >
          Nuevo cobro
        </Link>
      ) : (
        <div className="flex flex-col gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener noreferrer"
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
          <button
            type="button"
            onClick={marcarCobrado}
            className="h-12 rounded-2xl border border-secondary/25 text-sm font-bold text-secondary/80"
          >
            Simular que ya pagó (demo)
          </button>
        </div>
      )}
    </main>
  );
}
