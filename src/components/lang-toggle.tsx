"use client";

import type { Lang } from "@/lib/i18n";

const OPCIONES: Lang[] = ["es", "en"];

export function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
}) {
  // Las clases lg: lo adaptan a la barra del escritorio; en móvil no cambia nada.
  return (
    <div
      className="flex rounded-full bg-white p-1 shadow-sm lg:bg-aqua/15 lg:shadow-none"
      role="group"
      aria-label="Idioma / Language"
    >
      {OPCIONES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={`h-11 min-w-14 rounded-full px-3 text-sm font-bold uppercase lg:h-10 lg:min-w-16 lg:text-web-sm ${
            lang === l
              ? "bg-secondary text-white lg:bg-primary lg:text-white"
              : "text-secondary/70 lg:text-ink/60"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
