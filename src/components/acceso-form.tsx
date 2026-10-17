"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { LogoTrivo } from "@/components/web/marca";
import { SoloMovil } from "@/components/web/vista";

const MENSAJES: Record<string, string> = {
  pin_incorrecto: "Esa clave no es correcta.",
  demasiadas_solicitudes: "Demasiados intentos. Espera un minuto.",
  acceso_no_configurado:
    "El servidor no tiene clave de vendedor. Defínela en VENDEDOR_PIN (mínimo 8 caracteres).",
};

const TITULO = "Entrar a cobrar";
const AYUDA = "Escribe la clave del comercio para ver y crear cobros.";

export function AccesoForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    if (!pin || entrando) return;
    setEntrando(true);
    setError(null);
    try {
      const r = await fetch("/api/acceso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (r.ok) {
        router.replace("/");
        return;
      }
      const cuerpo = await r.json().catch(() => null);
      setError(
        MENSAJES[cuerpo?.error] ?? "No pudimos entrar. Intenta de nuevo.",
      );
    } catch {
      setError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
    }
    setEntrando(false);
  }

  const alEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    void entrar();
  };

  const campo = (clase: string) => (
    <input
      type="password"
      value={pin}
      onChange={(e) => setPin(e.target.value)}
      autoComplete="current-password"
      className={clase}
    />
  );

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4 lg:hidden">
          <header>
            <span className="text-xl font-bold tracking-tight text-primary">
              Trivo
            </span>
          </header>

          <form className="recibo flex flex-col gap-4 p-5" onSubmit={alEnviar}>
            <h1 className="text-3xl font-bold leading-tight">{TITULO}</h1>
            <p className="text-secondary/70">{AYUDA}</p>

            {error ? (
              <p role="alert" className="font-bold text-critico">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold">Clave</span>
              {campo("h-16 rounded-2xl bg-neutral px-4 text-xl")}
            </label>

            <button
              type="submit"
              disabled={!pin || entrando}
              className="h-16 rounded-2xl bg-primary text-xl font-bold text-white transition-opacity disabled:opacity-40"
            >
              {entrando ? "Entrando…" : "Entrar"}
            </button>
            <p className="text-center text-sm text-secondary/70">
              ¿Primera vez?{" "}
              <Link href="/registro" className="font-bold text-primary">
                Crea tu cuenta
              </Link>
            </p>
          </form>
        </main>
      </SoloMovil>

      {/* Escritorio (lg): barra con la marca, hero y una sola tarjeta centrada. */}
      <PantallaWeb
        nav={
          <header className="nav-web flex h-16 items-center px-6">
            <LogoTrivo />
          </header>
        }
        hero={
          <HeroWeb
            insignia="Comercio"
            IconoInsignia={IconEscudo}
            titulo={TITULO}
            subtitulo={AYUDA}
          />
        }
      >
        <form
          className="tarjeta-web web-paso mx-auto w-full max-w-140 text-web-sm"
          onSubmit={alEnviar}
        >
          <div className="flex flex-col gap-6 p-8">
            <label className="flex flex-col gap-2">
              <span className="font-bold">Clave</span>
              {campo("campo-web")}
            </label>
          </div>
          <div className="perforacion-web mx-6" />
          <div className="flex flex-col gap-4 px-8 pb-8 pt-6">
            {error ? (
              <p role="alert" className="font-bold text-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!pin || entrando}
              className="boton-web"
            >
              {entrando ? "Entrando…" : "Entrar"}
            </button>
            <p className="text-center text-web-xs text-ink/60">
              ¿Primera vez?{" "}
              <Link href="/registro" className="font-bold text-primary">
                Crea tu cuenta
              </Link>
            </p>
          </div>
        </form>
      </PantallaWeb>
    </>
  );
}
