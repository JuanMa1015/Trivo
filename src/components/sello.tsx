import { useId } from "react";

/** Sello de tinta: borde irregular, tinta despareja y doble aro. */
export function Sello({ texto }: { texto: string }) {
  const id = useId().replace(/:/g, "");
  const filtro = `tinta-${id}`;

  return (
    <svg
      viewBox="0 0 220 76"
      width="176"
      height="61"
      role="img"
      aria-label={texto}
      className="anim-sellar shrink-0 text-primary"
    >
      <defs>
        <filter id={filtro} x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed="4"
            result="borde"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="borde"
            scale="3"
            result="torcido"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="1"
            seed="9"
            result="grano"
          />
          <feColorMatrix
            in="grano"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.55"
            result="mascara"
          />
          <feComposite in="torcido" in2="mascara" operator="in" />
        </filter>
      </defs>
      <g
        filter={`url(#${filtro})`}
        fill="none"
        stroke="currentColor"
        opacity="0.92"
      >
        <rect x="4" y="4" width="212" height="68" rx="10" strokeWidth="4" />
        <rect x="11" y="11" width="198" height="54" rx="6" strokeWidth="1.5" />
        <text
          x="110"
          y="48"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontFamily="Helvetica, Arial, sans-serif"
          fontWeight="700"
          fontSize="26"
          letterSpacing="3"
          textLength="176"
          lengthAdjust="spacingAndGlyphs"
        >
          {texto.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}
