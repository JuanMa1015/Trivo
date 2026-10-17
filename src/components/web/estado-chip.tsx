import type { Estado } from "@/lib/cobros";

/** Mismas palabras que el chip móvil; en web van con punto y en 40 px. */
const ESTILO: Record<
  Estado,
  { fondo: string; punto: string; texto: string; clase?: string }
> = {
  esperando: { fondo: "bg-aqua/30", punto: "bg-aqua", texto: "Esperando" },
  procesando: {
    fondo: "bg-aqua/30",
    punto: "bg-aqua",
    texto: "Procesando",
    clase: "anim-latido",
  },
  cobrado: { fondo: "bg-primary/15", punto: "bg-primary", texto: "Cobrado" },
  vencido: { fondo: "bg-ink/10", punto: "bg-ink/40", texto: "Vencido" },
  fallido: {
    fondo: "bg-ink/10",
    punto: "bg-ink/40",
    texto: "Pago fallido",
    clase: "font-bold text-error",
  },
};

/** Chip de estado (escritorio): punto + palabra; nunca solo color. */
export function EstadoChipWeb({ estado }: { estado: Estado }) {
  const { fondo, punto, texto, clase = "text-ink" } = ESTILO[estado];
  return (
    <span className={`chip-web ${fondo} ${clase}`}>
      <span
        className={`size-2.5 shrink-0 rounded-full ${punto}`}
        aria-hidden="true"
      />
      {texto}
    </span>
  );
}
