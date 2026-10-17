"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useIdioma } from "@/components/use-idioma";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { NavPagador } from "@/components/web/nav-web";
import { textoDeError, textos } from "@/lib/i18n";

export function PagarForm() {
  const router = useRouter();
  // Si el regreso desde la wallet falló antes de saber de qué cobro era, llega aquí con ?e=.
  const errorRetorno = useSearchParams().get("e");
  // Se recuerda entre /pagar y el cobro, y la primera vez sigue al navegador.
  const [lang, setLang] = useIdioma();
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(errorRetorno);
  const t = textos[lang];
  const completo = codigo.length === 6;

  /** El código solo sirve para encontrar el token del cobro; el pago va por el token. */
  async function continuar() {
    if (!completo || buscando) return;
    setBuscando(true);
    setError(null);
    try {
      const r = await fetch("/api/pago/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const cuerpo = await r.json().catch(() => null);
      if (r.ok && typeof cuerpo?.token === "string") {
        router.push(`/p/${cuerpo.token}`);
        return;
      }
      setError(
        r.status === 404
          ? "codigo_no_encontrado"
          : (cuerpo?.error ?? "generico"),
      );
    } catch {
      setError("red");
    }
    setBuscando(false);
  }

  const mensajeError = error
    ? error === "codigo_no_encontrado"
      ? t.codigoNoEncontradoAyuda
      : textoDeError(t, error)
    : null;

  return (
    <>
      {/* Escritorio (lg): barra con idioma, hero y una sola tarjeta centrada. */}
      <PantallaWeb
        nav={<NavPagador lang={lang} onLang={setLang} />}
        hero={
          <HeroWeb
            insignia="Open Payments"
            IconoInsignia={IconEscudo}
            titulo={t.pagarTitulo}
            subtitulo={t.pagarAyuda}
          />
        }
      >
        <form
          className="tarjeta-web web-paso mx-auto w-full max-w-140 text-web-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void continuar();
          }}
        >
          <div className="flex flex-col gap-6 p-5 sm:p-8">
            <label className="flex flex-col gap-2">
              <span className="font-bold">{t.codigo}</span>
              <input
                value={codigo}
                onChange={(e) =>
                  setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="campo-web text-center text-medio font-bold tracking-[0.3em] placeholder:text-ink/40"
              />
            </label>
          </div>
          <div className="perforacion-web mx-4 sm:mx-6" />
          <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
            {mensajeError ? (
              <p role="alert" className="font-bold text-error">
                {mensajeError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!completo || buscando}
              className="boton-web"
            >
              {buscando ? t.calculando : t.continuar}
            </button>
          </div>
        </form>
      </PantallaWeb>
    </>
  );
}
