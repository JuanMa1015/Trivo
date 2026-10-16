import type { Estado } from "@/lib/cobros";

const ESTILO: Record<Estado, { clase: string; texto: string }> = {
  cobrado: { clase: "bg-primary text-white", texto: "Cobrado" },
  esperando: { clase: "bg-tertiary text-secondary", texto: "Esperando" },
  procesando: {
    clase: "bg-tertiary text-secondary anim-latido",
    texto: "Procesando",
  },
  vencido: {
    clase: "border border-secondary/30 text-secondary/70",
    texto: "Vencido",
  },
};

export function EstadoChip({ estado }: { estado: Estado }) {
  const { clase, texto } = ESTILO[estado];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${clase}`}>
      {texto}
    </span>
  );
}
