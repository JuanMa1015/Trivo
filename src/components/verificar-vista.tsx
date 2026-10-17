"use client";

import { IconCheck, IconClose, IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { pesosWeb } from "@/components/web/formato";
import { HeroWeb } from "@/components/web/hero-web";
import { Icono3D } from "@/components/web/icono-3d";
import { LogoTrivo } from "@/components/web/marca";
import { SoloMovil } from "@/components/web/vista";

export type DatosCertificado = {
  comercio: string;
  titular?: string;
  periodo: string;
  cobros: number;
  total: number;
  emitido: string;
};

const NOTA =
  "Resume los cobros recibidos con Trivo según sus registros. No es un certificado contable ni sustituye declaraciones ante la DIAN.";
const NO_VALIDO =
  "El código no coincide con los datos del enlace, o el enlace está incompleto. Pide al comercio un certificado nuevo y no confíes en este.";

/**
 * Resultado de /verificar con el diseño de Trivo. La página (servidor) ya comprobó la
 * firma; aquí solo se muestra lo que viene en el enlace.
 */
export function VerificarVista({ datos }: { datos: DatosCertificado | null }) {
  const valido = datos !== null;
  const titulo = valido ? "Certificado auténtico" : "No pudimos verificarlo";
  const subtitulo = valido
    ? "Estos datos coinciden con lo que Trivo firmó. Nadie los cambió."
    : "Este certificado no es válido.";

  const filas = datos
    ? [
        ["Comercio", datos.comercio],
        ...(datos.titular ? [["Titular", datos.titular]] : []),
        ["Periodo", datos.periodo],
        ["Cobros recibidos", String(datos.cobros)],
        ["Total cobrado", `${pesosWeb(datos.total)} COP`],
        ["Emitido el", datos.emitido],
      ]
    : [];

  const lista = (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="min-w-0">
          <dt className="text-sm text-secondary/70 lg:text-web-sm lg:text-ink/70">
            {etiqueta}
          </dt>
          <dd className="break-words text-lg font-bold lg:text-cuerpo lg:text-tinta">
            {valor}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-6 lg:hidden">
          <header>
            <LogoTrivo tamano={20} />
          </header>
          <section
            className="recibo flex flex-col gap-4 p-5"
            role={valido ? "status" : "alert"}
          >
            <h1
              className={`text-3xl font-bold leading-tight ${valido ? "text-primary" : "text-critico"}`}
            >
              {titulo}
            </h1>
            <p className="text-secondary/70">
              {valido ? subtitulo : NO_VALIDO}
            </p>
            {valido ? (
              <>
                {lista}
                <p className="text-sm text-secondary/70">{NOTA}</p>
              </>
            ) : null}
          </section>
        </main>
      </SoloMovil>

      <PantallaWeb
        nav={
          <header className="nav-web flex h-16 items-center px-6">
            <LogoTrivo />
          </header>
        }
        hero={
          <HeroWeb
            insignia="Verificación"
            IconoInsignia={IconEscudo}
            titulo={titulo}
            subtitulo={subtitulo}
          />
        }
      >
        <section
          className="tarjeta-web web-paso mx-auto flex w-full max-w-180 flex-col gap-6 p-8"
          role={valido ? "status" : "alert"}
        >
          <div className="flex items-center gap-4">
            <Icono3D
              Icono={valido ? IconCheck : IconClose}
              tono={valido ? "primario" : "tinta"}
              tamano={56}
            />
            <p
              className={`text-medio font-bold ${valido ? "text-tinta" : "text-error"}`}
            >
              {valido
                ? "Las cifras son las originales"
                : "No confíes en este certificado"}
            </p>
          </div>
          {valido ? (
            <>
              {lista}
              <div className="perforacion-web" />
              <p className="text-web-sm text-ink/70">{NOTA}</p>
            </>
          ) : (
            <p className="text-web-sm text-ink/70">{NO_VALIDO}</p>
          )}
        </section>
      </PantallaWeb>
    </>
  );
}
