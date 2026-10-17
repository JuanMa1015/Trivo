"use client";

import { EncabezadoMovil } from "@/components/encabezado-movil";
import { useEffect, useEffectEvent, useState } from "react";
import { useCobroEnVivo } from "@/components/cobro/use-cobro-en-vivo";
import { TalonarioLista } from "@/components/talonario-lista";
import Link from "next/link";
import { IconDocumento, IconWallet } from "@/components/icons";
import {
  AvisoWeb,
  EncabezadoTarjeta,
  PantallaWeb,
} from "@/components/web/contenedor";
import { EstadoChipWeb } from "@/components/web/estado-chip";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { Icono3D } from "@/components/web/icono-3d";
import { NavComercio } from "@/components/web/nav-web";
import { TarjetaCobroWeb } from "@/components/web/tarjeta-cobro";
import type { CobroResumen } from "@/lib/cobros";
import { horaDe, totalCobrado } from "@/lib/talonario";
import { usePerfil } from "@/lib/use-perfil";
import { usePolling } from "@/lib/use-polling";
import { SoloMovil } from "@/components/web/vista";

/** Tiempo de salida del detalle antes de que la lista vuelva a todo el ancho. */
const SALIDA_MS = 240;

/** Detalle de un cobro dentro del talonario: misma lógica que la pantalla del cobro. */
function DetalleCobro({
  id,
  numero,
  onCerrar,
}: {
  id: string;
  numero?: number;
  onCerrar: () => void;
}) {
  // Sin redirección tras simular: el vendedor se queda en su talonario.
  const vivo = useCobroEnVivo(id);
  return <TarjetaCobroWeb numero={numero} vivo={vivo} onCerrar={onCerrar} />;
}

/**
 * Talonario (/talonario): la misma lectura que la pantalla de inicio (GET /api/cobros
 * cada 3 s). En escritorio, la lista ocupa todo el ancho; al elegir un cobro se encoge
 * y el comprobante entra a la derecha. Por debajo de lg, la lista móvil de siempre.
 */
export function TalonarioWebScreen() {
  const { comercio } = usePerfil();
  const { data, estado } = usePolling<{ cobros: CobroResumen[] }>(
    "/api/cobros",
    3000,
  );
  const cobros = data?.cobros ?? [];
  const listo = data !== null;

  const [elegido, setElegido] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [cambio, setCambio] = useState(false);
  const abierto = elegido !== null && !cerrando;

  function cerrar() {
    if (elegido === null || cerrando) return;
    setCerrando(true);
    setTimeout(() => {
      setElegido(null);
      setCerrando(false);
    }, SALIDA_MS);
  }

  function elegir(id: string) {
    if (id === elegido) return cerrar();
    setCambio(elegido !== null);
    setCerrando(false);
    setElegido(id);
  }

  const alPresionar = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") cerrar();
  });
  useEffect(() => {
    const escuchar = (e: KeyboardEvent) => alPresionar(e);
    window.addEventListener("keydown", escuchar);
    return () => window.removeEventListener("keydown", escuchar);
  }, []);

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4 lg:hidden">
          <EncabezadoMovil />
          <TalonarioLista
            cobros={cobros}
            listo={listo}
            conError={estado === "error"}
          />
        </main>
      </SoloMovil>

      <PantallaWeb
        nav={<NavComercio seccion="talonario" />}
        hero={
          <HeroWeb
            insignia="Talonario"
            IconoInsignia={IconDocumento}
            titulo="Talonario de hoy"
            subtitulo="Cada cobro queda registrado en tu historial."
            comercio={comercio}
            tarjeta={{
              rotulo: "Cobrado",
              valor: pesosWeb(totalCobrado(cobros)),
            }}
          />
        }
      >
        {estado === "error" && !listo ? (
          <AvisoWeb tono="error">
            No pudimos cargar tu talonario. Reintentando…
          </AvisoWeb>
        ) : null}

        <div className="maestro-detalle min-h-0 flex-1" data-abierto={abierto}>
          <section
            className={`tarjeta-web @container flex max-h-[calc(100dvh-80px-var(--hero-alto)-var(--separacion)*3)] min-w-0 flex-col ${listo && cobros.length === 0 ? "self-stretch" : "self-start"}`}
            aria-labelledby="titulo-talonario"
          >
            <div className="px-6 pb-2 pt-6">
              <EncabezadoTarjeta
                icono={<IconDocumento width={24} height={24} />}
                titulo={<span id="titulo-talonario">Talonario de hoy</span>}
                subtitulo={
                  listo
                    ? `${cobros.length} ${cobros.length === 1 ? "cobro" : "cobros"}`
                    : undefined
                }
              />
            </div>
            {listo && cobros.length === 0 ? (
              <div className="web-escalonado flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <Icono3D Icono={IconDocumento} tono="cielo" tamano={80} />
                <p className="max-w-xs text-web-sm text-ink/60">
                  Tu primer comprobante aparece aquí cuando cobres.
                </p>
                <Link href="/" className="boton-web w-auto px-8">
                  <IconWallet width={20} height={20} />
                  Cobrar
                </Link>
              </div>
            ) : (
              <ul className="flex min-h-0 flex-col overflow-y-auto overflow-x-hidden pb-2">
                {cobros.map((c) => {
                  const activo = elegido === c.id && abierto;
                  return (
                    <li key={c.id} className="talon-web">
                      <button
                        type="button"
                        onClick={() => elegir(c.id)}
                        aria-expanded={activo}
                        aria-controls="detalle-cobro"
                        className={`grid min-h-18 w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 px-6 py-3 text-left text-web-sm transition-colors duration-200 @min-[640px]:grid-cols-[88px_minmax(0,1fr)_88px_160px_150px] ${
                          activo ? "bg-aqua/20" : "hover:bg-aqua/8"
                        }`}
                      >
                        {/* Talón: número separado por una línea punteada, como en papel. */}
                        <span className="row-span-2 flex h-full items-center border-r-2 border-dashed border-ink/12 font-bold text-tinta @min-[640px]:row-span-1">
                          #{String(c.numero).padStart(4, "0")}
                        </span>
                        <span className="truncate font-semibold text-tinta">
                          {c.concepto || "Sin concepto"}
                        </span>
                        <span className="col-start-2 row-start-2 text-ink/60 @min-[640px]:col-start-auto @min-[640px]:row-start-auto">
                          {horaDe(c.creadoEn)}
                        </span>
                        <span className="col-start-3 row-start-1 text-right text-cuerpo font-extrabold text-tinta @min-[640px]:col-start-auto @min-[640px]:row-start-auto">
                          {pesosWeb(c.monto)}
                        </span>
                        <span className="col-start-3 row-start-2 justify-self-end @min-[640px]:col-start-auto @min-[640px]:row-start-auto">
                          <EstadoChipWeb estado={c.estado} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div
            id="detalle-cobro"
            className="min-w-0 max-h-[calc(100dvh-80px-var(--hero-alto)-var(--separacion)*3)] self-stretch"
          >
            {elegido !== null ? (
              <div
                key={elegido}
                className={`h-full ${
                  cerrando
                    ? "web-detalle-salir"
                    : cambio
                      ? "web-aparecer"
                      : "web-detalle-entrar"
                }`}
              >
                <DetalleCobro
                  id={elegido}
                  numero={cobros.find((c) => c.id === elegido)?.numero}
                  onCerrar={cerrar}
                />
              </div>
            ) : null}
          </div>
        </div>
      </PantallaWeb>
    </>
  );
}
