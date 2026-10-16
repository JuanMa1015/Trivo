import { ETIQUETA_EVENTO, type Evento } from "@/lib/cobros";

const hora = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Línea de tiempo de un cobro: qué pasó, cuándo y con qué detalle. */
export function Trazabilidad({ eventos }: { eventos: readonly Evento[] }) {
  return (
    <details className="recibo group px-5 py-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-bold">
        Historial de este cobro
        <span className="text-sm text-secondary/70">
          {eventos.length} eventos
        </span>
      </summary>
      <ol className="mt-3 flex flex-col gap-3">
        {eventos.map((e, i) => (
          <li key={`${e.tipo}-${i}`} className="flex items-start gap-3">
            <time
              dateTime={e.en}
              className="w-[4.5rem] shrink-0 text-sm font-bold text-secondary/70"
            >
              {hora.format(new Date(e.en))}
            </time>
            <span>
              {ETIQUETA_EVENTO[e.tipo]}
              {e.detalle ? (
                <span className="block break-all text-sm text-secondary/70">
                  {e.detalle}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
