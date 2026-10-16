"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EstadoChip } from "@/components/estado-chip";
import { Keypad } from "@/components/keypad";
import { formatearPesos } from "@/lib/format";
import {
  COMERCIO_EJEMPLO,
  CONCEPTOS,
  aplicarTecla,
  generarCodigo,
  horaActual,
  siguienteNumero,
  totalCobrado,
} from "@/lib/talonario";
import { useTalonario } from "@/lib/talonario-store";

export function TalonarioScreen() {
  const router = useRouter();
  const { recibos, guardar, listo } = useTalonario();
  const [digitos, setDigitos] = useState("");
  const [concepto, setConcepto] = useState("");

  const visibles = listo ? recibos : [];
  const monto = Number(digitos);
  const numero = siguienteNumero(recibos);

  function cobrar() {
    if (monto <= 0) return;
    guardar([
      {
        numero,
        monto,
        concepto,
        codigo: generarCodigo(),
        estado: "esperando",
        hora: horaActual(),
      },
      ...recibos,
    ]);
    router.push(`/cobro/${numero}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-primary">
          Trivo
        </span>
        <span className="text-sm text-secondary/70">{COMERCIO_EJEMPLO}</span>
      </header>

      <div className="pila">
        <div className="pila-hoja" aria-hidden="true" />
        <div className="pila-hoja" aria-hidden="true" />
        <section className="recibo" aria-label="Nuevo cobro">
          <div className="p-4 pb-5">
            <p
              className={`text-6xl font-bold leading-none tracking-tight ${
                monto > 0 ? "text-secondary" : "text-secondary/60"
              }`}
              aria-live="polite"
            >
              {formatearPesos(monto)}
            </p>
          </div>

          <div className="perforacion" />

          <div className="p-4 pt-3">
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-secondary/70">
              <span>Concepto (opcional)</span>
              <span>
                {listo ? `N.º ${String(numero).padStart(4, "0")}` : null}
              </span>
            </div>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label="Concepto (opcional)"
            >
              {CONCEPTOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={concepto === c}
                  onClick={() => setConcepto(concepto === c ? "" : c)}
                  className={`h-11 rounded-full px-3 text-sm font-bold transition-colors ${
                    concepto === c
                      ? "bg-secondary text-white"
                      : "bg-neutral text-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Keypad onPress={(t) => setDigitos((d) => aplicarTecla(d, t))} />

      <button
        type="button"
        onClick={cobrar}
        disabled={monto <= 0}
        className="h-16 w-full rounded-2xl bg-primary text-xl font-bold text-white shadow-sm transition-[transform,opacity] duration-100 active:scale-[0.98] disabled:opacity-40"
      >
        Cobrar
      </button>

      <section aria-labelledby="talonario-titulo" className="mt-3">
        <div className="flex items-baseline justify-between">
          <h2 id="talonario-titulo" className="text-lg font-bold">
            Talonario de hoy
          </h2>
          <p className="text-sm text-secondary/70">
            Cobrado:{" "}
            <strong className="text-secondary">
              {formatearPesos(totalCobrado(visibles))}
            </strong>
          </p>
        </div>

        {listo && visibles.length === 0 ? (
          <p className="recibo mt-3 p-5 text-secondary/70">
            Tu primer recibo aparece aquí cuando cobres.
          </p>
        ) : (
          <ul className="recibo mt-3 overflow-hidden">
            {visibles.map((r) => (
              <li key={r.numero} className="talon">
                <Link
                  href={`/cobro/${r.numero}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3"
                >
                  <span className="w-12 shrink-0 border-r-2 border-dashed border-secondary/20 pr-3 text-sm font-bold text-secondary/70">
                    {String(r.numero).padStart(4, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">
                      {formatearPesos(r.monto)}
                    </span>
                    <span className="block text-sm text-secondary/70">
                      {r.concepto || "Sin concepto"} · {r.hora}
                    </span>
                  </span>
                  <EstadoChip estado={r.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-secondary/70">Datos de ejemplo</p>
      </section>
    </main>
  );
}
