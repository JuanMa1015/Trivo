"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { NavPagador } from "@/components/web/nav-web";
import { textoDeError, textos, type Lang } from "@/lib/i18n";
import { SoloMovil } from "@/components/web/vista";

export function PagarForm() {
  const router = useRouter();
  // Si el regreso desde la wallet falló antes de saber de qué cobro era, llega aquí con ?e=.
  const errorRetorno = useSearchParams().get("e");
  const [lang, setLang] = useState<Lang>("es");
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
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4 lg:hidden">
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
              void continuar();
            }}
          >
            <h1 className="text-3xl font-bold leading-tight">
              {t.pagarTitulo}
            </h1>
            <p className="text-secondary/70">{t.pagarAyuda}</p>

            {mensajeError ? (
              <p role="alert" className="font-bold text-critico">
                {mensajeError}
              </p>
            ) : null}

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
              disabled={!completo || buscando}
              className="h-16 rounded-2xl bg-primary text-xl font-bold text-white transition-opacity disabled:opacity-40"
            >
              {buscando ? t.calculando : t.continuar}
            </button>
          </form>
        </main>
      </SoloMovil>

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
          <div className="flex flex-col gap-6 p-8">
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
          <div className="perforacion-web mx-6" />
          <div className="flex flex-col gap-4 px-8 pb-8 pt-6">
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
