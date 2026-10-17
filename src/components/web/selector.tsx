"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconChevron } from "@/components/icons";

export type OpcionSelector = { valor: string; texto: string };

/** Alto máximo de la lista; si no cabe debajo del botón, se abre hacia arriba. */
const ALTO_LISTA = 304;

/**
 * Lista desplegable con el estilo de Trivo (el `<select>` nativo no deja dar estilo a sus
 * opciones). Se usa con mouse, toque o teclado: flechas, Inicio/Fin, Enter y Esc.
 */
export function Selector({
  etiqueta,
  valor,
  opciones,
  onCambio,
  compacto = false,
}: {
  /** Nombre accesible; no se muestra. */
  etiqueta: string;
  valor: string;
  opciones: readonly OpcionSelector[];
  onCambio: (valor: string) => void;
  /** Botón pequeño, como una píldora, para esquinas de tarjetas. */
  compacto?: boolean;
}) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [arriba, setArriba] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const indice = Math.max(
    0,
    opciones.findIndex((o) => o.valor === valor),
  );
  const elegida = opciones[indice];

  useEffect(() => {
    if (!abierto) return;
    lista.current?.focus();
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  // La opción activa siempre a la vista dentro de la lista.
  useEffect(() => {
    if (!abierto) return;
    lista.current
      ?.querySelector(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  function abrir() {
    const r = boton.current?.getBoundingClientRect();
    setArriba(r ? window.innerHeight - r.bottom < ALTO_LISTA + 16 : false);
    setActivo(indice);
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  function elegir(i: number) {
    const opcion = opciones[i];
    if (opcion) onCambio(opcion.valor);
    cerrar();
  }

  function alTeclearLista(e: React.KeyboardEvent) {
    const ultimo = opciones.length - 1;
    const mover: Record<string, number> = {
      ArrowDown: Math.min(activo + 1, ultimo),
      ArrowUp: Math.max(activo - 1, 0),
      Home: 0,
      End: ultimo,
    };
    if (e.key in mover) {
      e.preventDefault();
      setActivo(mover[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elegir(activo);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cerrar();
    } else if (e.key === "Tab") {
      setAbierto(false);
    }
  }

  return (
    <div ref={caja} className="relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? `${id}-lista` : undefined}
        aria-label={`${etiqueta}: ${elegida?.texto ?? ""}`}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            abrir();
          }
        }}
        className={
          compacto
            ? "flex h-10 items-center gap-2 rounded-full bg-white/80 px-4 text-web-sm font-bold text-tinta shadow-suave ring-1 ring-ink/8 transition-colors duration-200 hover:bg-white"
            : "campo-web flex w-full min-w-52 items-center justify-between gap-3 text-left font-semibold text-tinta"
        }
      >
        <span className="truncate first-letter:uppercase">
          {elegida?.texto}
        </span>
        <IconChevron
          width={18}
          height={18}
          className={`shrink-0 text-primary transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          tabIndex={-1}
          aria-label={etiqueta}
          aria-activedescendant={`${id}-${activo}`}
          onKeyDown={alTeclearLista}
          style={{ maxHeight: ALTO_LISTA }}
          className={`web-aparecer absolute z-40 flex min-w-full flex-col gap-0.5 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-tarjeta ring-1 ring-ink/8 outline-none ${
            compacto ? "right-0 w-max" : "left-0"
          } ${arriba ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {opciones.map((o, i) => {
            const seleccionada = i === indice;
            return (
              <li
                key={o.valor}
                id={`${id}-${i}`}
                data-indice={i}
                role="option"
                aria-selected={seleccionada}
                onPointerEnter={() => setActivo(i)}
                onClick={() => elegir(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl px-4 text-web-sm first-letter:uppercase ${
                  seleccionada ? "font-bold text-primary" : "text-tinta"
                } ${i === activo ? "bg-aqua/20" : ""}`}
              >
                <span className="first-letter:uppercase">{o.texto}</span>
                {seleccionada ? (
                  <IconCheck width={18} height={18} className="shrink-0" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
