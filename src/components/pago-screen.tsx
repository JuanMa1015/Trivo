"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { IconEscudo } from "@/components/icons";
import { Sello } from "@/components/sello";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { NavPagador } from "@/components/web/nav-web";
import { montoWeb } from "@/components/web/formato";
import {
  formatearCuentaRegresiva,
  costoConversion,
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

  /** Monto del cobro en COP, con el mismo formato que el móvil. */
  const montoCobro = pago
    ? formatearMonto(
        { valor: String(pago.monto * 100), codigo: "COP", escala: 2 },
        locale,
      )
    : "";

  /**
   * Escritorio (lg): barra con idioma, hero con quién cobra y cuánto, y una sola
   * tarjeta centrada con el contenido del paso (cada paso entra desde la derecha).
   */
  const enWeb = (paso: string, cuerpo: ReactNode, talon?: ReactNode) => (
    <PantallaWeb
      nav={<NavPagador lang={lang} onLang={setLang} />}
      hero={
        <HeroWeb
          insignia={pago ? t.pagasA : "Open Payments"}
          IconoInsignia={IconEscudo}
          titulo={pago ? pago.receptor : t.pagarTitulo}
          subtitulo={pago?.receptorWallet?.replace(/^https:\/\//, "")}
          tarjeta={pago ? { valor: montoWeb(montoCobro) } : undefined}
        />
      }
    >
      <article
        key={paso}
        className="tarjeta-web web-paso mx-auto w-full max-w-140 text-web-sm"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-8">{cuerpo}</div>
        {talon ? (
          <>
            <div className="perforacion-web mx-4 sm:mx-6" />
            <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
              {talon}
            </div>
          </>
        ) : null}
      </article>
    </PantallaWeb>
  );
  const botonOtroCodigo = (
    <Link href="/pagar" className="boton-web">
      {t.otroCodigo}
    </Link>
  );

  if (estado === "no_encontrado") {
    return (
      <>
        {enWeb(
          "no-encontrado",
          <>
            <h2 className="text-medio font-bold">{t.codigoNoEncontrado}</h2>
            <p className="text-ink/70">{t.codigoNoEncontradoAyuda}</p>
          </>,
          botonOtroCodigo,
        )}
      </>
    );
  }

  if (!pago) return <main className="flex-1" />;

  if (pago.estado === "cobrado") {
    return (
      <>
        {enWeb(
          "cobrado",
          <div className="flex flex-col items-center gap-4 text-center">
            {/* El sello vive dentro de la tarjeta, con aire alrededor. */}
            <div className="web-sello py-6">
              <Sello texto={t.exito} />
            </div>
            <p className="text-ink/70">{t.exitoAyuda}</p>
          </div>,
          <>
            {pago.confirmacion ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-bold text-ink/70">{t.codigoConfirmacion}</p>
                <p className="text-grande tracking-[0.12em] text-primary">
                  {pago.confirmacion}
                </p>
                <p className="text-ink/70">{t.confirmacionAyuda}</p>
              </div>
            ) : null}
            <Link href="/pagar" className="boton-web">
              {t.nuevoPago}
            </Link>
          </>,
        )}
      </>
    );
  }

  if (pago.estado === "procesando") {
    return (
      <>
        {enWeb(
          "procesando",
          <div className="flex flex-col gap-2" aria-live="polite">
            <h2 className="text-medio font-bold">{t.yendo}</h2>
            <p className="text-ink/70">{t.yendoAyuda}</p>
          </div>,
          <div
            className="h-2 overflow-hidden rounded-full bg-aqua/30"
            role="progressbar"
            aria-label={t.yendo}
          >
            <div className="anim-progreso h-full rounded-full bg-primary" />
          </div>,
        )}
      </>
    );
  }

  if (pago.estado === "fallido") {
    return (
      <>
        {enWeb(
          "fallido",
          <div className="flex flex-col gap-2" role="alert">
            <h2 className="text-medio font-bold text-error">{t.fallido}</h2>
            <p className="text-ink/70">{t.fallidoAyuda}</p>
          </div>,
          botonOtroCodigo,
        )}
      </>
    );
  }

  if (pago.estado === "vencido") {
    return (
      <>
        {enWeb(
          "vencido",
          <>
            <h2 className="text-medio font-bold">{t.vencido}</h2>
            <p className="text-ink/70">{t.vencidoAyuda}</p>
          </>,
          botonOtroCodigo,
        )}
      </>
    );
  }

  const tasa = precio ? tasaImplicita(precio.debito, precio.recibe) : null;
  const costo = precio
    ? costoConversion(precio.debito, precio.recibe, precio.tasaReferencia)
    : null;

  return (
    <>
      {enWeb(
        precio ? "precio" : "wallet",
        <>
          <p className="font-bold">{t.confirmaNombre}</p>

          <dl className="flex flex-col gap-3">
            <Fila dato={t.venceEn}>
              <span className="font-bold">
                {formatearCuentaRegresiva(
                  segundosRestantes(pago.venceEn, ahora),
                )}
              </span>
            </Fila>

            {precio ? (
              <>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-bold">{t.tuPagas}</dt>
                  <dd className="text-medio font-bold text-primary">
                    {montoWeb(formatearMonto(precio.debito, locale))}
                  </dd>
                </div>
                {tasa ? (
                  <Fila dato={t.tasa}>
                    1 {precio.debito.codigo} ={" "}
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 0,
                    }).format(tasa)}{" "}
                    {precio.recibe.codigo}
                  </Fila>
                ) : null}
                {tasa && precio.tasaReferencia ? (
                  <Fila dato={t.tasaReferencia}>
                    1 {precio.debito.codigo} ={" "}
                    {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 0,
                    }).format(precio.tasaReferencia)}{" "}
                    {precio.recibe.codigo}
                  </Fila>
                ) : null}
                {costo ? (
                  <Fila dato={t.costoConversion}>
                    <span className="font-bold">
                      ≈ {montoWeb(formatearMonto(costo.monto, locale))} (
                      {new Intl.NumberFormat(locale, {
                        maximumFractionDigits: 1,
                      }).format(costo.porcentaje)}
                      %)
                    </span>
                  </Fila>
                ) : null}
                {precio.pagador ? (
                  <Fila dato={t.desde}>
                    <span className="wrap-break-word font-bold">
                      {precio.pagador}
                    </span>
                  </Fila>
                ) : null}
                <Fila dato={t.precioValido}>
                  <span className="font-bold">
                    {formatearCuentaRegresiva(
                      segundosRestantes(precio.venceEn, ahora),
                    )}
                  </span>
                </Fila>
              </>
            ) : null}
          </dl>

          {precio ? (
            <p className="text-ink/70">
              {t.sinComision}
              {precio.tasaReferencia ? (
                <>
                  {" "}
                  {t.fuenteTasa}{" "}
                  <a
                    href="https://www.exchangerate-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ExchangeRate-API
                  </a>
                  .
                </>
              ) : null}
            </p>
          ) : null}
        </>,
        <>
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
                aria-describedby="wallet-ayuda-web"
                className="campo-web shadow-tarjeta placeholder:text-ink/50"
              />
              <span
                id="wallet-ayuda-web"
                className={
                  tocado && !walletValida
                    ? "font-bold text-error"
                    : "text-ink/70"
                }
              >
                {tocado && !walletValida ? t.walletError : t.walletAyuda}
              </span>
            </label>
          )}

          {error ? (
            <p role="alert" className="font-bold text-error">
              {textoDeError(t, error)}
            </p>
          ) : null}

          <p className="text-ink/70">{t.seguridad}</p>

          {precio ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={aprobar}
                disabled={cargando !== null}
                className="boton-web"
              >
                {cargando === "aprobando" ? t.llevando : t.aprobar}
              </button>
              <button
                type="button"
                onClick={() => setCotizacion(null)}
                disabled={cargando !== null}
                className="h-14 rounded-web font-bold text-primary underline underline-offset-4"
              >
                {t.cambiarWallet}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={verPrecio}
              disabled={cargando !== null}
              className="boton-web"
            >
              {cargando === "cotizando" ? t.calculando : t.verPrecio}
            </button>
          )}
        </>,
      )}
    </>
  );
}

/** Fila de dato y valor en la tarjeta de escritorio. */
function Fila({ dato, children }: { dato: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/70">{dato}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
