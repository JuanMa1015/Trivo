"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconLock } from "@/components/icons";
import { LangToggle } from "@/components/lang-toggle";
import { Sello } from "@/components/sello";
import { TASA_EJEMPLO_COP_POR_USD, copAUsd } from "@/lib/conversion";
import { formatearPesos } from "@/lib/format";
import { textos, type Lang } from "@/lib/i18n";
import { COMERCIO_EJEMPLO, MAX_DIGITOS } from "@/lib/talonario";
import { useTalonario } from "@/lib/talonario-store";

type Paso = "revisar" | "wallet" | "listo";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const cop = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Monto que viaja en el link del vendedor (`?m=`); nulo si falta o es inválido. */
function montoDelLink(valor: string | null): number | null {
  if (!valor || !/^\d+$/.test(valor) || valor.length > MAX_DIGITOS) return null;
  const monto = Number(valor);
  return monto > 0 ? monto : null;
}

export function PagoScreen({ codigo }: { codigo: string }) {
  const { recibos, guardar, listo } = useTalonario();
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>("es");
  const [paso, setPaso] = useState<Paso>("revisar");
  const [wallet, setWallet] = useState("");
  const [tocado, setTocado] = useState(false);
  const t = textos[lang];

  if (!listo) return <main className="flex-1" />;

  // Demo: sin backend, el monto sale del talonario de esta pestaña o del link.
  const recibo = recibos.find((r) => r.codigo === codigo);
  const monto = recibo?.monto ?? montoDelLink(params.get("m"));
  const walletValida = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/.test(wallet);

  function aprobar() {
    setTocado(true);
    if (walletValida) setPaso("wallet");
  }

  function terminar() {
    if (recibo) {
      guardar(
        recibos.map((r) =>
          r.codigo === codigo ? { ...r, estado: "cobrado" } : r,
        ),
      );
    }
    setPaso("listo");
  }

  const encabezado = (
    <header className="flex items-center justify-between">
      <span className="text-xl font-bold tracking-tight text-primary">
        Trivo
      </span>
      <LangToggle lang={lang} onChange={setLang} />
    </header>
  );

  if (monto === null) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4">
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4">
      {encabezado}

      {paso === "revisar" ? (
        <>
          <article className="recibo">
            <div className="p-5">
              <p className="text-secondary/70">
                <strong className="text-secondary">{COMERCIO_EJEMPLO}</strong>{" "}
                {t.teCobra}
              </p>
              <p className="mt-2 flex items-baseline gap-2 text-6xl font-bold leading-none tracking-tight">
                {formatearPesos(monto)}
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
                  {usd.format(copAUsd(monto))}
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
              className={`text-sm ${
                tocado && !walletValida
                  ? "font-bold text-critico"
                  : "text-secondary/70"
              }`}
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
            className="h-16 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
          >
            {t.aprobar}
          </button>
          <p className="text-sm text-secondary/70">{t.demo}</p>
        </>
      ) : null}

      {paso === "wallet" ? (
        <section className="recibo flex flex-col gap-4 p-5">
          <h1 className="text-3xl font-bold leading-tight">{t.yendo}</h1>
          <p className="text-secondary/70">{t.yendoAyuda}</p>
          <p className="anim-latido text-sm font-bold text-primary">
            {formatearPesos(monto)} · {usd.format(copAUsd(monto))}
          </p>
          <button
            type="button"
            onClick={terminar}
            className="h-14 rounded-2xl border border-secondary/25 font-bold text-secondary/80"
          >
            {t.simularAprobar}
          </button>
        </section>
      ) : null}

      {paso === "listo" ? (
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
      ) : null}
    </main>
  );
}
