import type { ComponentType, CSSProperties, SVGProps } from "react";

export type Tono3D = "primario" | "cielo" | "agua" | "tinta";

/**
 * Ícono glossy 3D: el ícono de línea dentro de una baldosa con volumen, brillo de
 * cristal y sombra de color (estilos en `.icono-3d`). Es decorativo: el texto que lo
 * acompaña es el que da el significado.
 */
export function Icono3D({
  Icono,
  tono = "primario",
  tamano = 48,
}: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  tono?: Tono3D;
  tamano?: number;
}) {
  const glifo = Math.round(tamano * 0.46);
  return (
    <span
      className="icono-3d"
      data-tono={tono === "primario" ? undefined : tono}
      style={{ "--t": `${tamano}px` } as CSSProperties}
      aria-hidden="true"
    >
      <Icono width={glifo} height={glifo} strokeWidth={2.2} />
    </span>
  );
}
