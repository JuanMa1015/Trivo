import { IconHistorial } from "@/components/icons";
import { ETIQUETA_EVENTO, type Evento } from "@/lib/cobros";

const hora = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Trazabilidad del cobro en escritorio: el mismo desplegable y los mismos textos que
 * `Trazabilidad`. Vive en el encabezado de la tarjeta y se abre como panel flotante,
 * así la tarjeta no crece y la pantalla no necesita scroll.
 */
export function TrazabilidadWeb({ eventos }: { eventos: readonly Evento[] }) {
  return (
    <details className="relative">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-web-xs font-semibold text-tinta transition-colors duration-200 hover:bg-aqua/15">
        <IconHistorial width={18} height={18} className="text-primary" />
        Historial de este cobro
      </summary>
      <div className="tarjeta-web web-subir absolute right-0 top-full z-30 mt-2 flex max-h-80 w-md flex-col gap-3 overflow-y-auto bg-white p-6 text-web-sm">
        <p className="text-ink/70">{eventos.length} eventos</p>
        <ol className="flex flex-col gap-3">
          {eventos.map((e, i) => (
            <li key={`${e.tipo}-${i}`} className="flex items-start gap-4">
              <time dateTime={e.en} className="w-20 shrink-0 text-ink/70">
                {hora.format(new Date(e.en))}
              </time>
              <span className="text-tinta">
                {ETIQUETA_EVENTO[e.tipo]}
                {e.detalle ? (
                  <span className="block break-all text-ink/70">
                    {e.detalle}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
