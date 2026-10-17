"use client";

import { useEffect, useEffectEvent, type Ref } from "react";
import { IconBorrarCampo, IconFlecha, IconWallet } from "@/components/icons";
import { pesosWeb } from "@/components/web/formato";
import { CONCEPTOS, aplicarTecla } from "@/lib/talonario";

const TECLAS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "00",
  "0",
  "borrar",
];

const miles = new Intl.NumberFormat("es-CO");

/** Teclado ⌫ dibujado (la tecla se anuncia como "Borrar último dígito"). */
function GlifoBorrar() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m12 9.5 5 5m0-5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Tarjeta izquierda de Cobrar (escritorio): campo del monto, conceptos, teclado y
 * botón. Todo pasa por los handlers de la pantalla; el campo aplica las mismas reglas
 * del teclado (`aplicarTecla`). En PC también responde al teclado físico.
 * En el cobro se muestra atenuada y sin interacción.
 */
export function PanelCobrarWeb({
  monto,
  concepto,
  creando = false,
  onConcepto,
  onTecla,
  onDigitos,
  onCobrar,
  campoRef,
  inactivo = false,
}: {
  monto: number;
  concepto: string;
  creando?: boolean;
  onConcepto?: (concepto: string) => void;
  onTecla?: (tecla: string) => void;
  /** Reemplaza los dígitos (lo que se escribe en el campo). */
  onDigitos?: (digitos: string) => void;
  onCobrar?: () => void;
  campoRef?: Ref<HTMLInputElement>;
  /** Teclado de fondo en el cobro: atenuado y sin foco ni clics. */
  inactivo?: boolean;
}) {
  const alTeclear = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const objetivo = e.target instanceof Element ? e.target : null;
    if (objetivo?.closest("input, textarea, select, [contenteditable]")) return;
    if (/^\d$/.test(e.key)) onTecla?.(e.key);
    else if (e.key === "Backspace") onTecla?.("borrar");
    else if (e.key === "Enter" && !objetivo?.closest("a, button")) onCobrar?.();
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    if (inactivo) return;
    const escuchar = (e: KeyboardEvent) => alTeclear(e);
    window.addEventListener("keydown", escuchar);
    return () => window.removeEventListener("keydown", escuchar);
  }, [inactivo]);

  return (
    <section
      className={`tarjeta-web flex flex-col gap-3 p-6 ${inactivo ? "web-atenuado" : ""}`}
      inert={inactivo}
      aria-hidden={inactivo || undefined}
      aria-labelledby="titulo-monto"
    >
      <div>
        <h2 id="titulo-monto" className="text-cuerpo font-bold text-tinta">
          Ingresa el monto
        </h2>
        <p className="text-web-xs text-ink/60">
          Escribe el valor que vas a cobrar
        </p>
      </div>

      <label className="campo-web">
        <span className="font-semibold text-ink/50">$</span>
        <input
          ref={campoRef}
          value={monto > 0 ? miles.format(monto) : ""}
          onChange={(e) =>
            onDigitos?.(
              [...e.target.value.replace(/\D/g, "")].reduce(
                (d, c) => aplicarTecla(d, c),
                "",
              ),
            )
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") onCobrar?.();
          }}
          inputMode="numeric"
          placeholder="0"
          aria-label="Monto a cobrar"
          className="text-cuerpo font-bold placeholder:font-normal placeholder:text-ink/30"
        />
        {monto > 0 ? (
          <button
            type="button"
            onClick={() => onDigitos?.("")}
            aria-label="Borrar monto"
            className="text-ink/40 transition-colors hover:text-ink/70"
          >
            <IconBorrarCampo width={20} height={20} />
          </button>
        ) : null}
      </label>

      <div className="flex gap-2" role="group" aria-label="Concepto (opcional)">
        {CONCEPTOS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={concepto === c}
            onClick={() => onConcepto?.(concepto === c ? "" : c)}
            className={`chip-web flex-1 ${
              concepto === c
                ? "bg-primary text-white"
                : "bg-aqua/15 text-tinta hover:bg-aqua/30"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="Teclado de monto"
      >
        {TECLAS.map((tecla) => (
          <button
            key={tecla}
            type="button"
            onClick={() => onTecla?.(tecla)}
            aria-label={tecla === "borrar" ? "Borrar último dígito" : tecla}
            className="tecla-web"
          >
            {tecla === "borrar" ? <GlifoBorrar /> : tecla}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCobrar}
        disabled={monto <= 0 || creando}
        className="boton-web mt-auto px-6"
      >
        <IconWallet width={22} height={22} />
        <span className="flex-1 text-left">
          {creando
            ? "Creando cobro…"
            : monto > 0
              ? `Cobrar ${pesosWeb(monto)}`
              : "Cobrar"}
        </span>
        <IconFlecha width={22} height={22} />
      </button>
    </section>
  );
}
