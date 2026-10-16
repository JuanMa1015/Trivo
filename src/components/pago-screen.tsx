"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck, IconLock } from "@/components/icons";
import { LangToggle } from "@/components/lang-toggle";
import { Sello } from "@/components/sello";
import { TASA_EJEMPLO_COP_POR_USD, copAUsd } from "@/lib/conversion";
import {
  formatearCuentaRegresiva,
  segundosRestantes,
  type PagoPublico,
} from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { textos, type Lang } from "@/lib/i18n";
import { useAhora, usePolling } from "@/lib/use-polling";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const CLAVE_WALLET = "trivo.wallet";

function walletGuardada(): string {
  try {
    return localStorage.getItem(CLAVE_WALLET) ?? "";
  } catch {
    return "";
  }
}

export function PagoScreen({ codigo }: { codigo: string }) {
  const { data, estado } = usePolling<{ pago: PagoPublico }>(
    `/api/pago/${codigo}`,
    2000,
  );
  const ahora = useAhora();
  const [lang, setLang] = useState<Lang>("es");
  const [wallet, setWallet] = useState(walletGuardada);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const t = textos[lang];
  const pago = data?.pago;
  const walletValida = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(wallet);

  const encabezado = (
    <header className="flex items-center justify-between">
      <span className="text-xl font-bold tracking-tight text-primary">
        Trivo
      </span>
      <LangToggle lang={lang} onChange={setLang} />
    </header>
  );
  const contenedor =
    "mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4";

  async function aprobar() {
    setTocado(true);
    if (!walletValida || enviando) return;
    setEnviando(true);
    setFallo(false);
    try {
      const r = await fetch(`/api/pago/${codigo}/aprobar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      if (!r.ok && r.status !== 409) throw new Error(String(r.status));
      try {
        localStorage.setItem(CLAVE_WALLET, wallet);
      } catch {
        // Storage unavailable: the wallet just won't be remembered.
      }
    } catch {
      setFallo(true);
    } finally {
      setEnviando(false);
    }
  }

  if (estado === "no_encontrado") {
    return (
      <main className={contenedor}>
        {encabezado}
        <section className="recibo flex flex-col items-start gap-4 p-5">
          <h1 className="text-3xl font-bold leading-tight">
            {t.codigoNoEncontrado}
          </h1>
          <p className="text-secondary/70">{t.codigoNoEncontradoAyuda}</p>
          <Link
            href="/pagar"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white"
          >
            {t.otroCodigo}
          </Link>
        </section>
      </main>
    );
  }

  if (!pago) return <main className="flex-1" />;

  if (pago.estado === "cobrado") {
    return (
      <main className={contenedor}>
        {encabezado}
        <section className="recibo flex flex-col items-start gap-4 p-5">
          <Sello texto={t.exito} />
          <p className="flex items-center gap-2 text-secondary/70">
            <IconCheck width={20} height={20} className="text-primary" />
            {t.exitoAyuda}
          </p>
          <Link
            href="/pagar"
            className="font-bold text-primary underline underline-offset-4"
          >
            {t.nuevoPago}
          </Link>
        </section>
      </main>
    );
  }

  if (pago.estado === "procesando") {
    return (
      <main className={contenedor}>
        {encabezado}
        <section className="recibo flex flex-col gap-4 p-5" aria-live="polite">
          <h1 className="text-3xl font-bold leading-tight">{t.yendo}</h1>
          <p className="text-secondary/70">{t.yendoAyuda}</p>
          <p className="anim-latido font-bold text-primary">
            {formatearPesos(pago.monto)} · {usd.format(copAUsd(pago.monto))}
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-neutral"
            role="progressbar"
            aria-label={t.yendo}
          >
            <div className="anim-progreso h-full rounded-full bg-primary" />
          </div>
        </section>
      </main>
    );
  }

  if (pago.estado === "vencido") {
    return (
      <main className={contenedor}>
        {encabezado}
        <section className="recibo flex flex-col items-start gap-4 p-5">
          <h1 className="text-3xl font-bold leading-tight">{t.vencido}</h1>
          <p className="text-secondary/70">{t.vencidoAyuda}</p>
          <Link
            href="/pagar"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white"
          >
            {t.otroCodigo}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={contenedor}>
      {encabezado}

      <article className="recibo">
        <div className="p-5">
          <p className="text-secondary/70">
            <strong className="text-secondary">{pago.comercio}</strong>{" "}
            {t.teCobra}
          </p>
          <p className="mt-2 flex items-baseline gap-2 text-6xl font-bold leading-none tracking-tight">
            {formatearPesos(pago.monto)}
            <span className="text-xl tracking-normal text-secondary/70">
              COP
            </span>
          </p>
        </div>

        <div className="perforacion" />

        <dl className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-bold">{t.tuPagas}</dt>
            <dd className="text-3xl font-bold text-primary">
              {usd.format(copAUsd(pago.monto))}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
            <dt>{t.tasa}</dt>
            <dd>1 USD = {cop.format(TASA_EJEMPLO_COP_POR_USD)} COP</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
            <dt>{t.comision}</dt>
            <dd>{t.sinComision}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
            <dt>{t.venceEn}</dt>
            <dd className="font-bold text-secondary">
              {formatearCuentaRegresiva(segundosRestantes(pago.venceEn, ahora))}
            </dd>
          </div>
        </dl>
      </article>

      <label className="flex flex-col gap-2">
        <span className="font-bold">{t.tuWallet}</span>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          onBlur={() => setTocado(true)}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://ilp.example.dev/tu-nombre"
          aria-invalid={tocado && !walletValida}
          aria-describedby="wallet-ayuda"
          className="h-14 rounded-2xl bg-white px-4 shadow-sm placeholder:text-secondary/65"
        />
        <span
          id="wallet-ayuda"
          className={`text-sm ${tocado && !walletValida ? "font-bold text-critico" : "text-secondary/70"}`}
        >
          {tocado && !walletValida ? t.walletError : t.walletAyuda}
        </span>
      </label>

      <p className="flex items-start gap-2 text-base text-secondary/80">
        <IconLock width={20} height={20} className="mt-0.5 shrink-0" />
        {t.seguridad}
      </p>

      <button
        type="button"
        onClick={aprobar}
        disabled={enviando}
        className="h-16 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-60"
      >
        {t.aprobar}
      </button>
      {fallo ? (
        <p role="alert" className="-mt-2 font-bold text-critico">
          {t.errorRed}
        </p>
      ) : null}
    </main>
  );
}
