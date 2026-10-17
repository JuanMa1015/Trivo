"use client";

import { IconPegar } from "@/components/icons";
import type { Lang } from "@/lib/i18n";

/*
 * Ayuda junto al campo de la wallet: dónde encontrar la wallet address y un botón para
 * pegarla. Los textos viven aquí (en los dos idiomas) porque solo los usa esta ayuda.
 */
const TEXTOS = {
  es: {
    pregunta: "¿Dónde la encuentro?",
    respuesta:
      "Abre la app o la página de tu wallet y busca la opción para recibir dinero o tu perfil. Tu wallet address es un enlace que empieza con https://, por ejemplo https://ilp.interledger-test.dev/tu-nombre. Cópiala y pégala aquí.",
    pegar: "Pegar",
  },
  en: {
    pregunta: "Where do I find it?",
    respuesta:
      "Open your wallet's app or website and look for the option to receive money, or your profile. Your wallet address is a link that starts with https://, for example https://ilp.interledger-test.dev/your-name. Copy it and paste it here.",
    pegar: "Paste",
  },
} satisfies Record<Lang, Record<string, string>>;

export function AyudaWallet({
  lang,
  onPegar,
}: {
  lang: Lang;
  onPegar: (texto: string) => void;
}) {
  const t = TEXTOS[lang];

  async function pegar() {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto.trim()) onPegar(texto.trim());
    } catch {
      // El navegador no dejó leer el portapapeles: se puede pegar a mano en el campo.
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm lg:text-web-sm">
      <div className="flex items-center justify-between gap-3">
        <details className="group flex-1">
          <summary className="flex min-h-11 cursor-pointer list-none items-center font-bold text-primary underline underline-offset-4">
            {t.pregunta}
          </summary>
          <p className="pb-1 text-secondary/80 lg:text-ink/70">{t.respuesta}</p>
        </details>
        <button
          type="button"
          onClick={pegar}
          className="flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-white px-4 font-bold text-secondary shadow-sm ring-1 ring-black/5"
        >
          <IconPegar width={18} height={18} />
          {t.pegar}
        </button>
      </div>
    </div>
  );
}
