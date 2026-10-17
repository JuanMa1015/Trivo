import { useId, type CSSProperties } from "react";

/** La "T" de Trivo: barra inclinada y tallo redondeado, en degradado de agua a primario. */
export function MarcaT({
  tamano = 32,
  tono = "degradado",
  className = "",
}: {
  tamano?: number;
  tono?: "degradado" | "claro";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const relleno = tono === "claro" ? "#ffffff" : `url(#t-${id})`;
  return (
    <svg
      viewBox="0 0 40 40"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className={className}
    >
      {tono === "degradado" ? (
        <defs>
          <linearGradient id={`t-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#80ced7" />
            <stop offset="1" stopColor="#007ea7" />
          </linearGradient>
        </defs>
      ) : null}
      <g fill="none" stroke={relleno} strokeLinecap="round" strokeWidth="7">
        <path d="M7 11.5 32 7" />
        <path d="M20 10.5 18 33" />
      </g>
    </svg>
  );
}

/** Logo: marca + nombre. */
export function LogoTrivo() {
  return (
    <span className="flex items-center gap-2">
      <MarcaT tamano={32} />
      <span className="text-medio font-extrabold tracking-tight text-tinta">
        Trivo
      </span>
    </span>
  );
}

/** Marcas "T" de fondo del hero: decorativas, flotan muy despacio. */
const MARCAS = [
  { x: "34%", y: "18%", t: 56, giro: -18, o: 0.55, b: 0 },
  { x: "46%", y: "52%", t: 88, giro: 14, o: 0.45, b: 0 },
  { x: "56%", y: "14%", t: 40, giro: 22, o: 0.35, b: 1 },
  { x: "62%", y: "58%", t: 52, giro: -10, o: 0.4, b: 0 },
  { x: "27%", y: "62%", t: 44, giro: 8, o: 0.3, b: 1 },
  { x: "71%", y: "20%", t: 64, giro: -24, o: 0.3, b: 2 },
];

export function MarcasHero() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {MARCAS.map((m, i) => (
        <span
          key={i}
          className="marca-flotante absolute"
          style={
            {
              left: m.x,
              top: m.y,
              opacity: m.o,
              filter: m.b ? `blur(${m.b}px)` : undefined,
              animationDelay: `${i * -0.9}s`,
              "--giro": `${m.giro}deg`,
            } as CSSProperties
          }
        >
          <MarcaT tamano={m.t} tono="claro" />
        </span>
      ))}
    </div>
  );
}
