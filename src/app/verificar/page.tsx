import { Suspense } from "react";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-6">
      <span className="text-xl font-bold tracking-tight text-primary">
        Trivo
      </span>
      {valido && p.success ? (
        <section className="recibo flex flex-col gap-4 p-5" role="status">
          <h1 className="text-3xl font-bold leading-tight text-primary">
            Certificado auténtico
          </h1>
          <p className="text-secondary/70">
            Estos datos coinciden con lo que Trivo firmó. Nadie los cambió.
          </p>
          <dl className="flex flex-col gap-3">
            <Fila etiqueta="Comercio" valor={p.data.n} />
            {p.data.u ? <Fila etiqueta="Titular" valor={p.data.u} /> : null}
            <Fila etiqueta="Periodo" valor={nombreDelMes(p.data.p)} />
            <Fila etiqueta="Cobros recibidos" valor={String(p.data.k)} />
            <Fila
              etiqueta="Total cobrado"
              valor={`$ ${p.data.t.toLocaleString("es-CO")} COP`}
            />
            <Fila etiqueta="Emitido el" valor={p.data.e} />
          </dl>
          <p className="text-sm text-secondary/70">
            Resume los cobros recibidos con Trivo según sus registros. No es un
            certificado contable ni sustituye declaraciones ante la DIAN.
          </p>
        </section>
      ) : (
        <section className="recibo flex flex-col gap-4 p-5" role="alert">
          <h1 className="text-3xl font-bold leading-tight text-critico">
            No pudimos verificarlo
          </h1>
          <p className="text-secondary/70">
            El código no coincide con los datos del enlace, o el enlace está
            incompleto. Pide al comercio un certificado nuevo y no confíes en
            este.
          </p>
        </section>
      )}
    </main>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-secondary/70">{etiqueta}</dt>
      <dd className="break-words text-lg font-bold">{valor}</dd>
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
