import { Suspense } from "react";
import { connection } from "next/server";
import {
  certificadoSchema,
  certificadoValido,
  nombreDelMes,
} from "@/server/certificado";
import { secretoConfirmacion } from "@/server/confirmacion";
import { VerificarVista } from "@/components/verificar-vista";

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
    <VerificarVista
      datos={
        valido && p.success
          ? {
              comercio: p.data.n,
              titular: p.data.u || undefined,
              periodo: nombreDelMes(p.data.p),
              cobros: p.data.k,
              total: p.data.t,
              emitido: p.data.e,
            }
          : null
      }
    />
  );
}

export default function VerificarPage(props: PageProps<"/verificar">) {
  return (
    <Suspense fallback={null}>
      <Resultado {...props} />
    </Suspense>
  );
}
