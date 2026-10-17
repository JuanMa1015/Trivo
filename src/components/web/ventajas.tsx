import type { ComponentType, SVGProps } from "react";
import { IconEscudo, IconMundo, IconRayo } from "@/components/icons";
import { Icono3D, type Tono3D } from "@/components/web/icono-3d";

/*
 * Lo que Open Payments le da al comercio, en palabras de tienda (ver PRODUCT.md:
 * pagos directos entre wallets, consentimiento en la wallet de quien paga, precio
 * y tasa visibles antes de aprobar, y sin comisión de Trivo).
 */
const VENTAJAS: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  titulo: string;
  texto: string;
  tono: Tono3D;
}[] = [
  {
    Icono: IconRayo,
    titulo: "Directo a tu wallet",
    texto: "El pago va de la wallet del cliente a la tuya, sin intermediarios.",
    tono: "primario",
  },
  {
    Icono: IconEscudo,
    titulo: "El cliente lo aprueba",
    texto: "El dinero solo se mueve cuando quien paga lo aprueba en su wallet.",
    tono: "cielo",
  },
  {
    Icono: IconMundo,
    titulo: "Cualquier moneda",
    texto: "Un turista paga en su moneda, ve la tasa antes y tú recibes pesos.",
    tono: "agua",
  },
];

/** Ventajas de cobrar con Open Payments (columna junto al código de pago vacío). */
export function VentajasOpenPayments() {
  return (
    <ul className="web-escalonado flex flex-col justify-center gap-6">
      {VENTAJAS.map(({ Icono, titulo, texto, tono }) => (
        <li key={titulo} className="flex items-start gap-4">
          <Icono3D Icono={Icono} tono={tono} tamano={52} />
          <span>
            <span className="block text-web-sm font-bold text-tinta">
              {titulo}
            </span>
            <span className="block text-web-xs text-ink/70">{texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
