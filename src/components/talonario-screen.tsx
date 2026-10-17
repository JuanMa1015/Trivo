"use client";

import { EncabezadoMovil } from "@/components/encabezado-movil";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { alRepetirCobro } from "@/components/cobro/repetir-cobro";
import { Keypad } from "@/components/keypad";
import { NavMovil } from "@/components/nav-movil";
import { TalonarioLista } from "@/components/talonario-lista";
import { EscritorioCobrar } from "@/components/web/escritorio-cobrar";
import type { Cobro, CobroResumen } from "@/lib/cobros";
import { pesosWeb } from "@/components/web/formato";
import { CONCEPTOS, aplicarTecla } from "@/lib/talonario";
import { usePolling } from "@/lib/use-polling";
import { SoloMovil } from "@/components/web/vista";

export function TalonarioScreen() {
  const router = useRouter();
  const { data, estado } = usePolling<{ cobros: CobroResumen[] }>(
    "/api/cobros",
    3000,
  );
  const [digitos, setDigitos] = useState("");
  const [concepto, setConcepto] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(false);

  // "Cobrar de nuevo" desde un cobro vencido o fallido: llega con su monto y concepto.
  // Corre cada vez que la pantalla vuelve a verse (Next la conserva montada).
  useEffect(
    () =>
      alRepetirCobro((repetir) => {
        setDigitos(String(repetir.monto));
        setConcepto(repetir.concepto);
      }),
    [],
  );

  const cobros = data?.cobros ?? [];
  const listo = data !== null;
  const monto = Number(digitos);
  const proximo = cobros.reduce((max, c) => Math.max(max, c.numero), 0) + 1;

  async function cobrar() {
    if (monto <= 0 || creando) return;
    setCreando(true);
    setError(false);
    try {
      const r = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, concepto }),
      });
      if (r.status === 403) {
        const cuerpo = await r.json().catch(() => null);
        if (cuerpo?.error === "registro_requerido") {
          router.push("/registro?obligatorio=1");
          return;
        }
      }
      if (!r.ok) throw new Error(String(r.status));
      const { cobro } = (await r.json()) as { cobro: Cobro };
      // La pantalla se conserva en caché al navegar: déjala lista para el próximo cobro.
      setDigitos("");
      setConcepto("");
      setCreando(false);
      router.push(`/cobro/${cobro.id}`);
    } catch {
      setError(true);
      setCreando(false);
    }
  }

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-28 pt-4 lg:hidden">
          <EncabezadoMovil />

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
                  {pesosWeb(monto)}
                </p>
              </div>

              <div className="perforacion" />

              <div className="p-4 pt-3">
                <div className="flex items-center justify-between gap-3 text-sm font-bold text-secondary/70">
                  <span>Concepto (opcional)</span>
                  <span>
                    {listo ? `N.º ${String(proximo).padStart(4, "0")}` : null}
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
            disabled={monto <= 0 || creando}
            className="h-16 w-full rounded-2xl bg-primary text-xl font-bold text-white shadow-sm transition-[transform,opacity] duration-100 active:scale-[0.98] disabled:opacity-40"
          >
            {creando ? "Creando cobro…" : "Cobrar"}
          </button>
          {error ? (
            <p role="alert" className="-mt-2 font-bold text-critico">
              No pudimos crear el cobro. Revisa tu conexión e intenta de nuevo.
            </p>
          ) : null}

          <TalonarioLista
            cobros={cobros}
            listo={listo}
            conError={estado === "error"}
          />
        </main>
        <NavMovil seccion="cobrar" />
      </SoloMovil>

      {/* Escritorio (lg): mismos estados y handlers que el móvil. */}
      <EscritorioCobrar
        monto={monto}
        concepto={concepto}
        creando={creando}
        error={error}
        onConcepto={setConcepto}
        onTecla={(t) => setDigitos((d) => aplicarTecla(d, t))}
        onDigitos={setDigitos}
        onCobrar={cobrar}
      />
    </>
  );
}
