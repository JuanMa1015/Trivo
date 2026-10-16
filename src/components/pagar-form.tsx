"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { textos, type Lang } from "@/lib/i18n";

export function PagarForm() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("es");
  const [codigo, setCodigo] = useState("");
  const t = textos[lang];
  const completo = codigo.length === 6;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-primary">
          Trivo
        </span>
        <LangToggle lang={lang} onChange={setLang} />
      </header>

      <form
        className="recibo flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (completo) router.push(`/p/${codigo}`);
        }}
      >
        <h1 className="text-3xl font-bold leading-tight">{t.pagarTitulo}</h1>
        <p className="text-secondary/70">{t.pagarAyuda}</p>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold">{t.codigo}</span>
          <input
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="h-16 rounded-2xl bg-neutral px-4 text-center text-4xl font-bold tracking-[0.3em] placeholder:text-secondary/70"
          />
        </label>

        <button
          type="submit"
          disabled={!completo}
          className="h-16 rounded-2xl bg-primary text-xl font-bold text-white transition-opacity disabled:opacity-40"
        >
          {t.continuar}
        </button>
      </form>
    </main>
  );
}
