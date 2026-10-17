"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MENSAJES: Record<string, string> = {
  pin_incorrecto: "Esa clave no es correcta.",
  demasiadas_solicitudes: "Demasiados intentos. Espera un minuto.",
  acceso_no_configurado:
    "El servidor no tiene clave de vendedor. Defínela en VENDEDOR_PIN (mínimo 8 caracteres).",
};

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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4">
      <header>
        <span className="text-xl font-bold tracking-tight text-primary">
          Trivo
        </span>
      </header>

      <form
        className="recibo flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void entrar();
        }}
      >
        <h1 className="text-3xl font-bold leading-tight">Entrar a cobrar</h1>
        <p className="text-secondary/70">
          Escribe la clave del comercio para ver y crear cobros.
        </p>

        {error ? (
          <p role="alert" className="font-bold text-critico">
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold">Clave</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
            className="h-16 rounded-2xl bg-neutral px-4 text-xl"
          />
        </label>

        <button
          type="submit"
          disabled={!pin || entrando}
          className="h-16 rounded-2xl bg-primary text-xl font-bold text-white transition-opacity disabled:opacity-40"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
