import { Suspense } from "react";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { LogoTrivo } from "@/components/web/marca";
import { connection } from "next/server";
import {
  certificadoSchema,
  certificadoValido,
  nombreDelMes,
} from "@/server/certificado";
import { secretoConfirmacion } from "@/server/confirmacion";

export const metadata = { title: "Verificar certificado · Trivo" };

/**
 * Página pública: comprueba que un certificado de ventas es auténtico. No muestra nada
 * que no venga ya en el enlace firmado y no guarda ni consulta datos del comercio.
 */
async function Resultado({ searchParams }: PageProps<"/verificar">) {
  await connection();
  const bruto = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [
      k,
      Array.isArray(v) ? v[0] : v,
    ]),
  );
  const p = certificadoSchema.safeParse(bruto);
  const valido =
    p.success &&
    certificadoValido(
      {
        comercio: p.data.n,
        usuario: p.data.u,
        periodo: p.data.p,
        total: p.data.t,
        cobros: p.data.k,
        emitido: p.data.e,
      },
      p.data.c,
      secretoConfirmacion(),
    );

  const mostrar = valido && p.success ? p.data : null;
  return (
    <PantallaWeb
      nav={
        <header className="nav-web flex h-16 items-center px-4 lg:px-6">
          <LogoTrivo />
        </header>
      }
      hero={
        <HeroWeb
          insignia="Verificación"
          IconoInsignia={IconEscudo}
          titulo={mostrar ? "Certificado auténtico" : "No pudimos verificarlo"}
          subtitulo={
            mostrar
              ? "Estos datos coinciden con lo que Trivo firmó. Nadie los cambió."
              : "El código no coincide con los datos del enlace, o el enlace está incompleto."
          }
        />
      }
    >
      <article
        className="tarjeta-web mx-auto w-full max-w-140 p-5 text-web-sm sm:p-8"
        role={mostrar ? "status" : "alert"}
      >
        {mostrar ? (
          <>
            <dl className="flex flex-col gap-4">
              <Fila etiqueta="Comercio" valor={mostrar.n} />
              {mostrar.u ? <Fila etiqueta="Titular" valor={mostrar.u} /> : null}
              <Fila etiqueta="Periodo" valor={nombreDelMes(mostrar.p)} />
              <Fila etiqueta="Cobros recibidos" valor={String(mostrar.k)} />
              <Fila
                etiqueta="Total cobrado"
                valor={`$ ${mostrar.t.toLocaleString("es-CO")} COP`}
              />
              <Fila etiqueta="Emitido el" valor={mostrar.e} />
            </dl>
            <p className="mt-5 text-web-xs text-ink/70">
              Resume los cobros recibidos con Trivo según sus registros. No es
              un certificado contable ni sustituye declaraciones ante la DIAN.
            </p>
          </>
        ) : (
          <p className="text-ink/70">
            Pide al comercio un certificado nuevo y no confíes en este.
          </p>
        )}
      </article>
    </PantallaWeb>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-web-xs text-ink/70">{etiqueta}</dt>
      <dd className="break-words text-cuerpo font-bold text-tinta">{valor}</dd>
    </div>
  );
}

export default function VerificarPage(props: PageProps<"/verificar">) {
  return (
    <Suspense fallback={null}>
      <Resultado {...props} />
    </Suspense>
  );
}
