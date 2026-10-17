import Link from "next/link";
import { EstadoChip } from "@/components/estado-chip";
import type { CobroResumen } from "@/lib/cobros";
import { formatearPesos } from "@/lib/format";
import { horaDe, totalCobrado } from "@/lib/talonario";

/**
 * Talonario de hoy en móvil: total cobrado y talones. Mismo marcado que tenía la
 * pantalla de inicio; vive aparte para que /talonario lo reutilice por debajo de lg.
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
  return (
    <section aria-labelledby="talonario-titulo" className="mt-3">
      <div className="flex items-baseline justify-between">
        <h2 id="talonario-titulo" className="text-lg font-bold">
          Talonario de hoy
        </h2>
        <p className="text-sm text-secondary/70">
          Cobrado:{" "}
          <strong className="text-secondary">
            {formatearPesos(totalCobrado(cobros))}
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
        <ul className="recibo mt-3 overflow-hidden">
          {cobros.map((c) => (
            <li key={c.numero} className="talon">
              <Link
                href={`/cobro/${c.numero}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3"
              >
                <span className="w-12 shrink-0 border-r-2 border-dashed border-secondary/20 pr-3 text-sm font-bold text-secondary/70">
                  {String(c.numero).padStart(4, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-bold">
                    {formatearPesos(c.monto)}
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
      )}
    </section>
  );
}
