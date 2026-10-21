"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconClose } from "@/components/icons";

/**
 * Ventana sobre la pantalla, con `<dialog>` nativo: mantiene el foco adentro, cierra con
 * Esc, con la X o tocando fuera, y devuelve el foco al botón que la abrió.
 */
export function Modal({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  const id = useId();
  const ventana = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ventana.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ventana}
      aria-labelledby={`${id}-titulo`}
      onClose={onCerrar}
      // Tocar el fondo (fuera de la tarjeta) cierra.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto rounded-web bg-papel p-0 text-ink shadow-tarjeta backdrop:bg-tinta/50"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <header className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2
              id={`${id}-titulo`}
              className="text-medio font-bold leading-tight text-tinta"
            >
              {titulo}
            </h2>
            {subtitulo ? (
              <p className="mt-1 text-web-sm text-ink/70">{subtitulo}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="boton-circular shrink-0"
          >
            <IconClose width={20} height={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
