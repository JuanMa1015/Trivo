import Link from "next/link";
import { EstadoChip } from "@/components/estado-chip";
import { agruparPorDia, cobrosDeHoy } from "@/components/talonario/por-dia";
import { pesosWeb } from "@/components/web/formato";
import type { CobroResumen } from "@/lib/cobros";
import { horaDe, totalCobrado } from "@/lib/talonario";

/**
 * Talonario de hoy en móvil: lo cobrado hoy y los talones agrupados por día. Mismo
 * marcado que tenía la pantalla de inicio; vive aparte para que /talonario lo reutilice
 * por debajo de lg.
 */
export function TalonarioLista({
  cobros,
  listo,
  conError,
}: {
  cobros: readonly CobroResumen[];
  listo: boolean;
  conError: boolean;
}) {
  const grupos = agruparPorDia(cobros);
  return (
    <section aria-labelledby="talonario-titulo" className="mt-3">
      <div className="flex items-baseline justify-between">
        <h2 id="talonario-titulo" className="text-lg font-bold">
          Talonario de hoy
        </h2>
        <p className="text-sm text-secondary/70">
          Cobrado hoy:{" "}
          <strong className="text-secondary">
            {pesosWeb(totalCobrado(cobrosDeHoy(cobros)))}
          </strong>
        </p>
      </div>

      {conError && !listo ? (
        <p className="recibo mt-3 p-5 font-bold text-critico">
          No pudimos cargar tu talonario. Reintentando…
        </p>
      ) : listo && cobros.length === 0 ? (
        <p className="recibo mt-3 p-5 text-secondary/70">
          Tu primer comprobante aparece aquí cuando cobres.
        </p>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.dia} className="mt-3">
            {grupo.titulo === "Hoy" && grupos.length === 1 ? null : (
              <h3 className="mb-2 mt-4 text-sm font-bold text-secondary/70">
                {grupo.titulo}
              </h3>
            )}
            <ul className="recibo overflow-hidden">
              {grupo.cobros.map((c) => (
                <li key={c.id} className="talon">
                  <Link
                    href={`/cobro/${c.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3"
                  >
                    <span className="w-12 shrink-0 border-r-2 border-dashed border-secondary/20 pr-3 text-sm font-bold text-secondary/70">
                      {String(c.numero).padStart(4, "0")}
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold">
                        {pesosWeb(c.monto)}
                      </span>
                      <span className="block text-sm text-secondary/70">
                        {c.concepto || "Sin concepto"} · {horaDe(c.creadoEn)}
                      </span>
                    </span>
                    <EstadoChip estado={c.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
