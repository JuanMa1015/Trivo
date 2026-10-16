"use client";

import { IconBackspace } from "./icons";

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

export function Keypad({ onPress }: { onPress: (tecla: string) => void }) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label="Teclado de monto"
    >
      {TECLAS.map((tecla) => (
        <button
          key={tecla}
          type="button"
          onClick={() => onPress(tecla)}
          aria-label={tecla === "borrar" ? "Borrar último dígito" : tecla}
          className="flex h-16 [@media(max-height:820px)]:h-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-secondary shadow-sm transition-transform duration-100 active:scale-95 active:bg-tertiary/40"
        >
          {tecla === "borrar" ? (
            <IconBackspace width={26} height={26} />
          ) : (
            tecla
          )}
        </button>
      ))}
    </div>
  );
}
