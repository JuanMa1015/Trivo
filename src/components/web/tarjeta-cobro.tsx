"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  enlaceDePago,
  mensajeDeCobro,
  pagadorDe,
  registrarEvento,
  type CobroEnVivo,
} from "@/components/cobro/use-cobro-en-vivo";
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconDocumento,
  IconQr,
  IconReloj,
  IconSend,
} from "@/components/icons";
import { Qr } from "@/components/qr";
import { Sello } from "@/components/sello";
import { EncabezadoTarjeta } from "@/components/web/contenedor";
import { Icono3D } from "@/components/web/icono-3d";
import { EstadoChipWeb } from "@/components/web/estado-chip";
import { TrazabilidadWeb } from "@/components/web/trazabilidad-web";
import { VentajasOpenPayments } from "@/components/web/ventajas";
import { formatearCuentaRegresiva, segundosRestantes } from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { codigoAgrupado, horaDe } from "@/lib/talonario";

const numeroDe = (n: number) => `#${String(n).padStart(4, "0")}`;

/**
 * Tarjeta derecha (escritorio), con forma de hoja de talonario: cuerpo, perforación
 * y talón. Se llama "Código de pago" antes de cobrar, "Cobro #" mientras espera y
 * "Comprobante #" solo cuando ya se cobró.
 */
function Hoja({
  encabezado,
  cuerpo,
  talon,
  clase = "",
}: {
  encabezado: ReactNode;
  cuerpo: ReactNode;
  talon?: ReactNode;
  clase?: string;
}) {
  return (
    <section className={`tarjeta-web flex h-full min-h-0 flex-col ${clase}`}>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {encabezado}
        {cuerpo}
      </div>
      {talon ? (
        <>
          <div className="perforacion-web mx-4 sm:mx-6" />
          <div className="flex flex-col gap-3 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
            {talon}
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Visor del QR vacío, con el texto de dónde aparece el código. */
function VisorVacio({ texto }: { texto?: string }) {
  return (
    <div className="visor-qr">
      <div className="qr-hueco grid place-items-center content-center gap-3 text-center">
        <span className="mx-auto">
          <Icono3D Icono={IconQr} tamano={64} />
        </span>
        {texto ? (
          <p className="max-w-44 text-web-sm text-ink/60">{texto}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Antes de cobrar: dónde aparece el código y por qué cobrar con Open Payments. */
export function TarjetaCobroVacia({
  numero,
  soloEscritorio = false,
}: {
  numero?: number;
  /** En Cobrar, el celular ya tiene el teclado: la tarjeta vacía solo estorba. */
  soloEscritorio?: boolean;
}) {
  return (
    <Hoja
      clase={soloEscritorio ? "max-lg:hidden" : ""}
      encabezado={
        <EncabezadoTarjeta
          icono={<IconQr width={24} height={24} />}
          titulo={numero ? `Cobro ${numeroDe(numero)}` : "Código de pago"}
          subtitulo="Escanea el código o ingresa el número"
        />
      }
      cuerpo={
        <div className="grid flex-1 grid-cols-1 items-center justify-items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:justify-items-stretch lg:gap-8">
          <VisorVacio
            texto={numero ? undefined : "Aquí aparece el código de tu cobro"}
          />
          <div className="lg:border-l lg:border-ink/8 lg:pl-8">
            <VentajasOpenPayments />
          </div>
        </div>
      }
    />
  );
}

/** El cobro en vivo, con la lógica de `useCobroEnVivo`. */
export function TarjetaCobroWeb({
  numero,
  vivo,
  onCerrar,
}: {
  /** N.º para el título mientras carga; el cobro se identifica por su id. */
  numero?: number;
  vivo: CobroEnVivo;
  /** En el talonario: botón circular de cerrar. */
  onCerrar?: () => void;
}) {
  const { cobro, modo, ahora, copiado, copiar, simular } = vivo;
  const cerrar = onCerrar ? (
    <button
      type="button"
      onClick={onCerrar}
      aria-label="Cerrar"
      className="boton-circular"
    >
      <IconClose width={20} height={20} />
    </button>
  ) : null;

  if (!cobro) {
    return onCerrar ? (
      <Hoja
        encabezado={
          <EncabezadoTarjeta
            icono={<IconDocumento width={24} height={24} />}
            titulo={numero ? `Cobro ${numeroDe(numero)}` : "Cobro"}
            acciones={cerrar}
          />
        }
        cuerpo={<div className="flex-1" />}
      />
    ) : (
      <TarjetaCobroVacia numero={numero} />
    );
  }

  const esperando = cobro.estado === "esperando";
  const procesando = cobro.estado === "procesando";
  const cobrado = cobro.estado === "cobrado";
  const vencido = cobro.estado === "vencido";
  const fallido = cobro.estado === "fallido";
  const pagador = pagadorDe(cobro);
  // Esperando y procesando comparten el cuerpo (el QR solo se atenúa); los demás entran de nuevo.
  const grupo = esperando || procesando ? "codigo" : cobro.estado;

  return (
    <Hoja
      encabezado={
        <EncabezadoTarjeta
          icono={
            cobrado ? (
              <IconDocumento width={24} height={24} />
            ) : (
              <IconQr width={24} height={24} />
            )
          }
          titulo={`${cobrado ? "Comprobante" : "Cobro"} ${numeroDe(cobro.numero)}`}
          subtitulo={
            esperando ? "Escanea el código o ingresa el número" : undefined
          }
          acciones={
            <>
              <TrazabilidadWeb eventos={cobro.eventos} />
              {cerrar}
            </>
          }
        />
      }
      cuerpo={
        <div
          key={grupo}
          className="web-escalonado flex flex-1 flex-col justify-center"
        >
          {esperando || procesando ? (
            <div className="grid grid-cols-1 items-center justify-items-center gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:justify-items-stretch lg:gap-8">
              <div className="visor-qr" data-atenuado={procesando}>
                <Qr
                  texto={enlaceDePago(cobro)}
                  etiqueta={`QR para pagar ${formatearPesos(cobro.monto)}`}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <p className="text-web-sm text-ink/60">
                  Dile este código a quien te paga
                </p>
                <p className="whitespace-nowrap text-grande font-extrabold tracking-[0.06em] text-primary">
                  {codigoAgrupado(cobro.codigo)}
                </p>
                <p className="text-web-sm text-ink/60">
                  O que escanee este QR con la cámara.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <EstadoChipWeb estado={cobro.estado} />
                  {esperando ? (
                    <span className="flex items-center gap-1.5 text-web-sm text-ink/60">
                      <IconReloj width={16} height={16} />
                      Vence en{" "}
                      <strong className="text-tinta">
                        {formatearCuentaRegresiva(
                          segundosRestantes(cobro.venceEn, ahora),
                        )}
                      </strong>
                    </span>
                  ) : (
                    <span className="anim-latido text-web-sm text-ink/60">
                      Confirmando el pago…
                    </span>
                  )}
                </div>
                {procesando ? (
                  <div
                    className="h-2 overflow-hidden rounded-full bg-aqua/30"
                    role="progressbar"
                    aria-label="Confirmando el pago"
                  >
                    <div className="anim-progreso h-full rounded-full bg-primary" />
                  </div>
                ) : null}
                {pagador ? (
                  <p className="text-web-sm text-ink/60">
                    Quien paga:{" "}
                    <strong className="break-all text-tinta">{pagador}</strong>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {cobrado ? (
            <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
              <div className="flex flex-col items-center gap-2 text-center">
                {/* El sello va solo, con aire alrededor, nunca sobre un monto o texto. */}
                <div className="web-sello py-4">
                  <Sello texto="Cobrado" />
                </div>
                <p className="text-web-sm text-ink/60">
                  Se sumó a tu historial. Descarga tu comprobante abajo.
                </p>
                {pagador ? (
                  <p className="text-web-sm text-ink/60">
                    Pagó:{" "}
                    <strong className="break-all text-tinta">{pagador}</strong>
                  </p>
                ) : null}
              </div>
              {cobro.confirmacion ? (
                <div className="flex flex-col gap-2 rounded-3xl bg-aqua/12 p-6">
                  <p className="text-web-sm font-bold text-ink/60">
                    Código de confirmación
                  </p>
                  <p className="text-grande font-extrabold tracking-[0.12em] text-primary">
                    {cobro.confirmacion}
                  </p>
                  <p className="text-web-sm text-ink/60">
                    El cliente debe ver el mismo código en su pantalla. Si es
                    distinto, no entregues nada todavía.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {vencido ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <EstadoChipWeb estado="vencido" />
              <p className="text-web-sm text-ink/60">
                Venció a las {horaDe(cobro.venceEn)}. Crea uno nuevo.
              </p>
            </div>
          ) : null}

          {fallido ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <EstadoChipWeb estado="fallido" />
              <p
                className="max-w-md text-web-sm font-bold text-error"
                role="alert"
              >
                La wallet de quien paga no pudo completar el pago, por ejemplo
                por saldo insuficiente. No recibiste el dinero: crea un cobro
                nuevo.
              </p>
            </div>
          ) : null}
        </div>
      }
      talon={
        <>
          <dl className="flex gap-8 text-web-sm">
            <div className="flex gap-2">
              <dt className="text-ink/60">Hora</dt>
              <dd className="font-bold text-tinta">{horaDe(cobro.creadoEn)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink/60">Concepto</dt>
              <dd className="font-bold text-tinta">
                {cobro.concepto || "Sin concepto"}
              </dd>
            </div>
          </dl>

          {esperando ? (
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensajeDeCobro(cobro))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrarEvento(cobro.id, "compartido_whatsapp")}
                className="boton-web min-w-52 flex-1"
              >
                <IconSend width={20} height={20} />
                Enviar por WhatsApp
              </a>
              <button
                type="button"
                onClick={copiar}
                aria-live="polite"
                className="boton-web-borde min-w-52 flex-1"
              >
                {copiado ? (
                  <IconCheck width={20} height={20} />
                ) : (
                  <IconCopy width={20} height={20} />
                )}
                {copiado ? "¡Link copiado!" : "Copiar link de pago"}
              </button>
              {modo === "demo" ? (
                <button
                  type="button"
                  onClick={simular}
                  className="boton-web-borde min-w-52 flex-1"
                >
                  Simular que ya pagó (demo)
                </button>
              ) : null}
            </div>
          ) : null}
          {cobrado ? (
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/cobros/${cobro.id}/comprobante?formato=a4`}
                download
                className="boton-web-borde min-w-52 flex-1"
              >
                Descargar comprobante (PDF)
              </a>
              <a
                href={`/api/cobros/${cobro.id}/comprobante?formato=pos`}
                download
                className="boton-web-borde min-w-52 flex-1"
              >
                Ticket para impresora POS
              </a>
            </div>
          ) : null}
          {cobrado || vencido || fallido ? (
            <Link href="/" className="boton-web">
              Nuevo cobro
            </Link>
          ) : null}
        </>
      }
    />
  );
}
