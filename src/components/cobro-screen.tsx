"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoChip } from "@/components/estado-chip";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconSend,
} from "@/components/icons";
import { Qr } from "@/components/qr";
import { Sello } from "@/components/sello";
import { Trazabilidad } from "@/components/trazabilidad";
import {
  enlaceDePago,
  mensajeDeCobro,
  pagadorDe,
  registrarEvento,
  useCobroEnVivo,
} from "@/components/cobro/use-cobro-en-vivo";
import { EscritorioCobro } from "@/components/web/escritorio-cobro";
import { formatearCuentaRegresiva, segundosRestantes } from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { codigoAgrupado, horaDe } from "@/lib/talonario";
import { SoloMovil } from "@/components/web/vista";

export function CobroScreen({ id }: { id: string }) {
  const router = useRouter();
  // Sondeo, aviso al cobrar, copiar y simular: misma lógica de siempre, en un hook.
  // Tras simular el pago (~5 s) vuelve al inicio, como antes.
  const vivo = useCobroEnVivo(id, () => router.push("/"));
  const { estado, cobro, ahora, copiado, copiar, simular } = vivo;
  const data = vivo.modo ? { modo: vivo.modo } : null;
  const cobrado = cobro?.estado === "cobrado";

  // Escritorio (lg): banner de Cobrar y dos columnas; a la derecha el ticket del cobro.
  const escritorio = (
    <EscritorioCobro vivo={vivo} noEncontrado={estado === "no_encontrado"} />
  );

  if (estado === "no_encontrado") {
    return (
      <>
        <SoloMovil>
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start gap-4 px-4 py-8 lg:hidden">
            <h1 className="text-2xl font-bold">
              No encontramos este comprobante
            </h1>
            <p className="text-secondary/70">
              Puede que el servidor se haya reiniciado. Vuelve al talonario para
              ver tus cobros.
            </p>
            <Link
              href="/"
              className="font-bold text-primary underline underline-offset-4"
            >
              Volver al talonario
            </Link>
          </main>
        </SoloMovil>
        {escritorio}
      </>
    );
  }

  if (!cobro)
    return (
      <>
        <SoloMovil>
          <main className="flex-1 lg:hidden" />
        </SoloMovil>
        {escritorio}
      </>
    );

  // El link y el QR llevan el token (128 bits); el código de 6 dígitos solo se dice en voz alta.
  const enlace = enlaceDePago(cobro);
  const pagador = pagadorDe(cobro);
  const mensaje = mensajeDeCobro(cobro);
  const procesando = cobro.estado === "procesando";
  const esperando = cobro.estado === "esperando";
  const vencido = cobro.estado === "vencido";
  const fallido = cobro.estado === "fallido";
  const restante = segundosRestantes(cobro.venceEn, ahora);

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4 lg:hidden">
          <Link
            href="/"
            className="flex h-11 w-fit items-center gap-2 font-bold text-primary"
          >
            <IconArrowLeft width={22} height={22} /> Talonario
          </Link>

          <article className="recibo">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-5xl font-bold leading-none tracking-tight">
                  {formatearPesos(cobro.monto)}
                </p>
                <span className="shrink-0 pt-1 text-sm font-bold text-secondary/70">
                  N.º {String(cobro.numero).padStart(4, "0")}
                </span>
              </div>
              <p className="mt-2 text-secondary/70">
                {cobro.concepto || "Sin concepto"} · {horaDe(cobro.creadoEn)}
              </p>
            </div>

            <div className="perforacion" />

            <div className="anim-rasgar p-5">
              {esperando ? (
                <>
                  <p className="text-sm font-bold text-secondary/70">
                    Dile este código a quien te paga
                  </p>
                  <p className="mt-1 text-6xl font-bold tracking-[0.06em] text-primary">
                    {codigoAgrupado(cobro.codigo)}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <Qr
                      texto={enlace}
                      etiqueta={`QR para pagar ${formatearPesos(cobro.monto)}`}
                    />
                    <p className="text-sm text-secondary/70">
                      O que escanee este QR con la cámara.
                    </p>
                  </div>
                </>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <EstadoChip estado={cobro.estado} />
                {esperando ? (
                  <span className="text-sm text-secondary/70">
                    Vence en{" "}
                    <strong className="text-secondary">
                      {formatearCuentaRegresiva(restante)}
                    </strong>
                  </span>
                ) : null}
                {procesando ? (
                  <span className="anim-latido text-sm text-secondary/70">
                    Confirmando el pago…
                  </span>
                ) : null}
                {vencido ? (
                  <span className="text-sm text-secondary/70">
                    Venció a las {horaDe(cobro.venceEn)}. Crea uno nuevo.
                  </span>
                ) : null}
                {fallido ? (
                  <span className="text-sm font-bold text-critico" role="alert">
                    La wallet de quien paga no pudo completar el pago, por
                    ejemplo por saldo insuficiente. No recibiste el dinero: crea
                    un cobro nuevo.
                  </span>
                ) : null}
              </div>

              {pagador ? (
                <p className="mt-3 text-sm text-secondary/70">
                  {cobrado ? "Pagó:" : "Quien paga:"}{" "}
                  <strong className="break-all text-secondary">
                    {pagador}
                  </strong>
                </p>
              ) : null}

              {procesando ? (
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-neutral"
                  role="progressbar"
                  aria-label="Confirmando el pago"
                >
                  <div className="anim-progreso h-full rounded-full bg-primary" />
                </div>
              ) : null}

              {cobrado ? (
                <div className="mt-2 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Sello texto="Cobrado" />
                    <p className="text-sm text-secondary/70">
                      Se sumó a tu historial. Descarga tu comprobante abajo.
                    </p>
                  </div>
                  {cobro.confirmacion ? (
                    <div className="rounded-2xl bg-neutral p-4">
                      <p className="text-sm font-bold text-secondary/70">
                        Código de confirmación
                      </p>
                      <p className="mt-1 text-5xl font-bold tracking-[0.12em] text-primary">
                        {cobro.confirmacion}
                      </p>
                      <p className="mt-2 text-sm text-secondary/80">
                        El cliente debe ver el mismo código en su pantalla. Si
                        es distinto, no entregues nada todavía.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>

          {esperando ? (
            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrarEvento(id, "compartido_whatsapp")}
                className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
              >
                <IconSend width={24} height={24} /> Enviar por WhatsApp
              </a>
              <button
                type="button"
                onClick={copiar}
                className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-white text-lg font-bold shadow-sm active:scale-[0.98]"
              >
                {copiado ? (
                  <IconCheck width={22} height={22} />
                ) : (
                  <IconCopy width={22} height={22} />
                )}
                {copiado ? "Link copiado" : "Copiar link de pago"}
              </button>
              {data?.modo === "demo" ? (
                <button
                  type="button"
                  onClick={simular}
                  className="h-12 rounded-2xl border border-secondary/25 text-sm font-bold text-secondary/80"
                >
                  Simular que ya pagó (demo)
                </button>
              ) : null}
            </div>
          ) : null}

          {cobrado ? (
            <div className="flex flex-col gap-3">
              <a
                href={`/api/cobros/${cobro.id}/comprobante?formato=a4`}
                download
                className="flex h-12 items-center justify-center rounded-2xl border border-secondary/25 text-base font-bold text-secondary"
              >
                Descargar comprobante (PDF)
              </a>
              <a
                href={`/api/cobros/${cobro.id}/comprobante?formato=pos`}
                download
                className="flex h-12 items-center justify-center rounded-2xl border border-secondary/25 text-base font-bold text-secondary"
              >
                Ticket para impresora POS
              </a>
            </div>
          ) : null}

          {cobrado || vencido || fallido ? (
            <Link
              href="/"
              className="flex h-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white shadow-sm active:scale-[0.98]"
            >
              Nuevo cobro
            </Link>
          ) : null}

          <Trazabilidad eventos={cobro.eventos} />
        </main>
      </SoloMovil>

      {escritorio}
    </>
  );
}
