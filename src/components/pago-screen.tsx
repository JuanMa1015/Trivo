"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconCheck, IconLock } from "@/components/icons";
import { LangToggle } from "@/components/lang-toggle";
import { Sello } from "@/components/sello";
import {
  formatearCuentaRegresiva,
  segundosRestantes,
  tasaImplicita,
  type CotizacionPublica,
  type PagoPublico,
} from "@/lib/cobros";
import { formatearMonto } from "@/lib/format";
import { textoDeError, textos, type Lang } from "@/lib/i18n";
import { useAhora, usePolling } from "@/lib/use-polling";

const CLAVE_WALLET = "trivo.wallet";
const LOCALE: Record<Lang, string> = { es: "es-CO", en: "en-US" };
const WALLET_VALIDA = /^https:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/;

function walletGuardada(): string {
  try {
    return localStorage.getItem(CLAVE_WALLET) ?? "";
  } catch {
    return "";
  }
}

async function pedir<T>(
  ruta: string,
  cuerpo: unknown,
): Promise<{ ok: true; datos: T } | { ok: false; error: string }> {
  try {
    const r = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const datos = await r.json().catch(() => null);
    return r.ok
      ? { ok: true, datos: datos as T }
      : { ok: false, error: datos?.error ?? "generico" };
  } catch {
    return { ok: false, error: "red" };
  }
}

export function PagoScreen({ token }: { token: string }) {
  const params = useSearchParams();
  // Cada segundo: la confirmación del dinero tiene que sentirse inmediata.
  const { data, estado } = usePolling<{ pago: PagoPublico }>(
    `/api/pago/${token}`,
    1000,
  );
  const ahora = useAhora();
  const [lang, setLang] = useState<Lang>("es");
  const [wallet, setWallet] = useState(walletGuardada);
  const [tocado, setTocado] = useState(false);
  const [cotizacion, setCotizacion] = useState<CotizacionPublica | null>(null);
  const [cargando, setCargando] = useState<"cotizando" | "aprobando" | null>(
    null,
  );
  // Código de error: viene de la API o del regreso desde la wallet (?e=).
  const [error, setError] = useState<string | null>(params.get("e"));
  const t = textos[lang];
  const locale = LOCALE[lang];
  const pago = data?.pago;
  const walletValida = WALLET_VALIDA.test(wallet);

  // El precio de la wallet vence solo: pasado ese momento hay que pedirlo de nuevo.
  const precio =
    cotizacion && Date.parse(cotizacion.venceEn) > ahora ? cotizacion : null;

  async function verPrecio() {
    setTocado(true);
    if (!walletValida || cargando) return;
    setCargando("cotizando");
    setError(null);
    const r = await pedir<{ cotizacion: CotizacionPublica }>(
      `/api/pago/${token}/cotizar`,
      { wallet },
    );
    setCargando(null);
    if (!r.ok) return setError(r.error);
    setCotizacion(r.datos.cotizacion);
    try {
      localStorage.setItem(CLAVE_WALLET, wallet);
    } catch {
      // Sin almacenamiento: solo no se recuerda la wallet.
    }
  }

  async function aprobar() {
    if (!precio || cargando) return;
    setCargando("aprobando");
    setError(null);
    const r = await pedir<{ redirect?: string }>(`/api/pago/${token}/aprobar`, {
      intentoId: precio.intentoId,
    });
    if (!r.ok) {
      setCargando(null);
      if (r.error === "cotizacion_vencida") setCotizacion(null);
      return setError(r.error);
    }
    // Con Open Payments real el pagador aprueba en su wallet y regresa a /api/pago/retorno.
    if (r.datos.redirect && r.datos.redirect.startsWith("https://")) {
      window.location.assign(r.datos.redirect);
      return;
    }
    setCargando(null); // modo demo: el sondeo muestra "procesando"
  }

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

          {pago.confirmacion ? (
            <div className="w-full rounded-2xl bg-neutral p-4">
              <p className="text-sm font-bold text-secondary/70">
                {t.codigoConfirmacion}
              </p>
              <p className="mt-1 text-5xl font-bold tracking-[0.12em] text-primary">
                {pago.confirmacion}
              </p>
              <p className="mt-2 text-sm text-secondary/80">
                {t.confirmacionAyuda}
              </p>
            </div>
          ) : null}
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

  if (pago.estado === "fallido") {
    return (
      <main className={contenedor}>
        {encabezado}
        <section
          className="recibo flex flex-col items-start gap-4 p-5"
          role="alert"
        >
          <h1 className="text-3xl font-bold leading-tight text-critico">
            {t.fallido}
          </h1>
          <p className="text-secondary/70">{t.fallidoAyuda}</p>
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

  const tasa = precio ? tasaImplicita(precio.debito, precio.recibe) : null;

  return (
    <main className={contenedor}>
      {encabezado}

      <article className="recibo">
        <div className="p-5">
          {/* El nombre lo declara la wallet receptora: sirve para confirmar a quién se paga. */}
          <p className="text-sm font-bold text-secondary/70">{t.pagasA}</p>
          <p className="mt-1 break-words text-3xl font-bold leading-tight">
            {pago.receptor}
          </p>
          {pago.receptorWallet ? (
            <p className="mt-1 break-all text-sm text-secondary/70">
              {pago.receptorWallet.replace(/^https:\/\//, "")}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-bold text-secondary">
            {t.confirmaNombre}
          </p>
          <p className="mt-3 text-5xl font-bold leading-none tracking-tight">
            {formatearMonto(
              { valor: String(pago.monto * 100), codigo: "COP", escala: 2 },
              locale,
            )}
          </p>
        </div>

        <div className="perforacion" />

        <dl className="flex flex-col gap-3 p-5">
          <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
            <dt>{t.venceEn}</dt>
            <dd className="font-bold text-secondary">
              {formatearCuentaRegresiva(segundosRestantes(pago.venceEn, ahora))}
            </dd>
          </div>

          {precio ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-bold">{t.tuPagas}</dt>
                <dd className="text-3xl font-bold text-primary">
                  {formatearMonto(precio.debito, locale)}
                </dd>
              </div>
              {tasa ? (
                <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
                  <dt>{t.tasa}</dt>
                  <dd>
                    1 {precio.debito.codigo} ={" "}
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 0,
                    }).format(tasa)}{" "}
                    {precio.recibe.codigo}
                  </dd>
                </div>
              ) : null}
              {precio.pagador ? (
                <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
                  <dt>{t.desde}</dt>
                  <dd className="break-words text-right font-bold text-secondary">
                    {precio.pagador}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 text-sm text-secondary/70">
                <dt>{t.precioValido}</dt>
                <dd className="font-bold text-secondary">
                  {formatearCuentaRegresiva(
                    segundosRestantes(precio.venceEn, ahora),
                  )}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </article>

      {precio ? null : (
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
      )}

      {error ? (
        <p role="alert" className="font-bold text-critico">
          {textoDeError(t, error)}
        </p>
      ) : null}

      <p className="flex items-start gap-2 text-base text-secondary/80">
        <IconLock width={20} height={20} className="mt-0.5 shrink-0" />
        {t.seguridad}
      </p>

      {precio ? (
        <>
          <button
            type="button"
            onClick={aprobar}
            disabled={cargando !== null}
            className="h-16 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-60"
          >
            {cargando === "aprobando" ? t.llevando : t.aprobar}
          </button>
          <button
            type="button"
            onClick={() => setCotizacion(null)}
            disabled={cargando !== null}
            className="h-11 font-bold text-primary underline underline-offset-4"
          >
            {t.cambiarWallet}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={verPrecio}
          disabled={cargando !== null}
          className="h-16 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98] disabled:opacity-60"
        >
          {cargando === "cotizando" ? t.calculando : t.verPrecio}
        </button>
      )}
    </main>
  );
}
