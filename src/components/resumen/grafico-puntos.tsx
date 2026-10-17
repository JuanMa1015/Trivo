const TONOS = {
  /** Sobre superficies claras. */
  claro: { punto: "bg-aqua/70", resaltado: "bg-primary" },
  /** Sobre la tarjeta de tinta. */
  tinta: { punto: "bg-white/25", resaltado: "bg-aqua" },
} as const;

/**
 * Columnas de puntos: cada columna crece con su valor; la resaltada va en color pleno.
 * Sin datos queda una fila de un punto por columna. Es decorativo: el dato va en texto.
 */
export function GraficoPuntos({
  valores,
  resaltado,
  tono = "claro",
  maxPuntos = 6,
  grande = false,
}: {
  valores: readonly number[];
  resaltado: number | null;
  tono?: keyof typeof TONOS;
  maxPuntos?: number;
  /** Puntos de 10 px repartidos a todo el ancho (gráfico de la semana). */
  grande?: boolean;
}) {
  const max = Math.max(0, ...valores);
  const colores = TONOS[tono];

  return (
    <div
      className={
        grande
          ? "grid h-full auto-cols-fr grid-flow-col items-end justify-items-center"
          : "flex items-end gap-1.5"
      }
      aria-hidden="true"
    >
      {valores.map((valor, i) => {
        const puntos =
          max > 0 ? Math.max(1, Math.round((valor / max) * maxPuntos)) : 1;
        return (
          <div
            key={i}
            className={`flex flex-col-reverse ${grande ? "gap-1.5" : "gap-1"}`}
          >
            {Array.from({ length: puntos }, (_, j) => (
              <span
                key={j}
                className={`block rounded-full transition-colors duration-200 ${
                  grande ? "size-2.5" : "size-1.5"
                } ${i === resaltado ? colores.resaltado : colores.punto}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
