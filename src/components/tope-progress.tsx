import { calcularProgreso, type Nivel } from "@/lib/topes";
import { formatearPesos } from "@/lib/format";

const ESTILO: Record<
  Nivel,
  { barra: string; texto: string; etiqueta: string }
> = {
  ok: { barra: "bg-primary", texto: "text-primary", etiqueta: "Vas bien" },
  atencion: {
    barra: "bg-atencion",
    texto: "text-atencion",
    etiqueta: "Atención",
  },
  critico: {
    barra: "bg-critico",
    texto: "text-critico",
    etiqueta: "Muy cerca del tope",
  },
  superado: {
    barra: "bg-critico",
    texto: "text-critico",
    etiqueta: "Tope superado",
  },
};

type Props = {
  nombre: string;
  acumulado: number;
  limite: number;
  descripcion?: string;
};

export function TopeProgress({
  nombre,
  acumulado,
  limite,
  descripcion,
}: Props) {
  const { porcentaje, restante, nivel } = calcularProgreso(acumulado, limite);
  const estilo = ESTILO[nivel];
  const ancho = Math.min(porcentaje, 100);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-secondary">{nombre}</h3>
        <span className={`text-sm font-bold ${estilo.texto}`}>
          {estilo.etiqueta}
        </span>
      </div>
      {descripcion ? (
        <p className="mt-1 text-sm text-secondary/70">{descripcion}</p>
      ) : null}
      <div
        role="progressbar"
        aria-label={nombre}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ancho}
        aria-valuetext={`${porcentaje}% del tope`}
        className="mt-3 h-3 overflow-hidden rounded-full bg-neutral"
      >
        <div
          className={`h-full rounded-full ${estilo.barra}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-secondary">
        {formatearPesos(acumulado)} de {formatearPesos(limite)} ({porcentaje}%)
        {nivel === "superado" ? null : (
          <> · te faltan {formatearPesos(restante)}</>
        )}
      </p>
    </section>
  );
}
