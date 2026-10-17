import type { ComponentType, ReactNode, SVGProps } from "react";
import { Icono3D, type Tono3D } from "@/components/web/icono-3d";

/**
 * Tarjeta de un dato (Resumen e Impuestos): ícono 3D arriba, algo pequeño en la esquina
 * (un gráfico, un anillo o un control) y abajo la etiqueta con el valor grande. Lo justo
 * para leerlo de un vistazo.
 */
export function TarjetaDato({
  Icono,
  tono,
  etiqueta,
  valor,
  detalle,
  esquina,
  destacado = false,
  claseValor = "text-tinta",
  children,
}: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  tono: Tono3D;
  etiqueta: string;
  valor?: string;
  /** Una línea corta debajo del valor. */
  detalle?: ReactNode;
  esquina?: ReactNode;
  /** Sobre agua, como el hero. */
  destacado?: boolean;
  claseValor?: string;
  /** En lugar del valor (por ejemplo, un campo). */
  children?: ReactNode;
}) {
  return (
    <section
      className={`contenedor-cifra flex min-h-0 flex-col justify-between gap-3 rounded-web p-5 shadow-tarjeta 2xl:p-6 ${
        destacado ? "hero-mini" : "bg-papel"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <Icono3D Icono={Icono} tono={tono} tamano={48} />
        {esquina}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-web-sm text-ink/70">{etiqueta}</h2>
        {valor !== undefined ? (
          <p className={`cifra-web ${claseValor}`}>{valor}</p>
        ) : null}
        {children}
        {detalle ? <p className="text-web-sm text-ink/70">{detalle}</p> : null}
      </div>
    </section>
  );
}
