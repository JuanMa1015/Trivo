import { useId, type CSSProperties } from "react";

/*
 * Marca de Trivo (redibujada del logo oficial):
 * - Ícono: "T" con la barra en dos tonos (teal y cian, separados en diagonal) y el
 *   tallo con el corte inclinado abajo.
 * - Logotipo: "Trivo" en azul marino con el punto de la i en teal.
 * Los colores de la marca solo se usan aquí; la interfaz conserva su paleta.
 */
const MARINO = "#0b1a33";
const TEAL = "#007a93";
const CIAN = "#45cde0";

const BARRA =
  "M8 44V32c0-6.6 5.4-12 12-12h70.5c1.7 0 2.9 1.7 2.4 3.3C89.6 34.6 80.4 44 68 44Z";
const BRILLO =
  "M47 44c6.5-6.2 11.6-14.8 15.4-24h28.1c1.7 0 2.9 1.7 2.4 3.3C89.6 34.6 80.4 44 68 44Z";
const TALLO =
  "M44 44h14v33c0 3.6-1.8 6.9-4.8 8.8l-10.6 6.8c-2 1.3-4.6-.1-4.6-2.5V55c0-4.9 2.4-8.6 6-11Z";

/**
 * Ícono "T" de Trivo.
 * `color`: teal y cian (sobre fondos claros). `claro`: blanco con el brillo
 * translúcido (sobre el hero o fondos oscuros).
 */
export function MarcaT({
  tamano = 32,
  tono = "color",
  className = "",
}: {
  tamano?: number;
  tono?: "color" | "claro";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const claro = tono === "claro";
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className={className}
    >
      {claro ? null : (
        <defs>
          <linearGradient id={`brillo-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={CIAN} />
            <stop offset="1" stopColor="#7fe3f0" />
          </linearGradient>
        </defs>
      )}
      <path d={BARRA} fill={claro ? "#fff" : TEAL} />
      <path
        d={BRILLO}
        fill={claro ? "#fff" : `url(#brillo-${id})`}
        opacity={claro ? 0.55 : 1}
      />
      <path d={TALLO} fill={claro ? "#fff" : TEAL} />
    </svg>
  );
}

/** Logotipo "Trivo": letras en marino y el punto de la i en teal. */
export function PalabraTrivo({ tamano = 24 }: { tamano?: number }) {
  return (
    <span
      className="font-(family-name:--font-jakarta) font-extrabold leading-none tracking-[-0.02em]"
      style={{ fontSize: tamano, color: MARINO }}
    >
      Tr
      <span className="relative">
        ı
        <span
          className="absolute left-1/2 top-[0.02em] size-[0.3em] -translate-x-1/2 rounded-full"
          style={{ background: TEAL }}
          aria-hidden="true"
        />
      </span>
      vo
    </span>
  );
}

/** Logo completo: ícono y logotipo. Se anuncia como "Trivo". */
export function LogoTrivo({ tamano = 24 }: { tamano?: number }) {
  return (
    <span className="flex items-center gap-2" role="img" aria-label="Trivo">
      <MarcaT tamano={Math.round(tamano * 1.4)} />
      <span aria-hidden="true">
        <PalabraTrivo tamano={tamano} />
      </span>
    </span>
  );
}

/** Marcas "T" de fondo del hero: decorativas, flotan muy despacio. */
const MARCAS = [
  { x: "34%", y: "18%", t: 56, giro: -12, o: 0.55, b: 0 },
  { x: "46%", y: "50%", t: 88, giro: 10, o: 0.45, b: 0 },
  { x: "56%", y: "12%", t: 40, giro: 16, o: 0.35, b: 1 },
  { x: "62%", y: "56%", t: 52, giro: -8, o: 0.4, b: 0 },
  { x: "27%", y: "60%", t: 44, giro: 6, o: 0.3, b: 1 },
  { x: "71%", y: "18%", t: 64, giro: -16, o: 0.3, b: 2 },
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
