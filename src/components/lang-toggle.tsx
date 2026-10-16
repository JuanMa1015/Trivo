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
  return (
    <div
      className="flex rounded-full bg-white p-1 shadow-sm"
      role="group"
      aria-label="Idioma / Language"
    >
      {OPCIONES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={`h-11 min-w-14 rounded-full px-3 text-sm font-bold uppercase ${
            lang === l ? "bg-secondary text-white" : "text-secondary/70"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
