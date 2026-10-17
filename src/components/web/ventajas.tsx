import type { ComponentType, SVGProps } from "react";
import { IconEscudo, IconMundo, IconRayo } from "@/components/icons";

/*
 * Lo que Open Payments le da al comercio, en palabras de tienda (ver PRODUCT.md:
 * pagos directos entre wallets, consentimiento en la wallet de quien paga, precio
 * y tasa visibles antes de aprobar, y sin comisión de Trivo).
 */
const VENTAJAS: {
  Icono: ComponentType<SVGProps<SVGSVGElement>>;
  titulo: string;
  texto: string;
  tono: string;
}[] = [
  {
    Icono: IconRayo,
    titulo: "Directo a tu wallet",
    texto: "El pago va de la wallet del cliente a la tuya, sin intermediarios.",
    tono: "bg-aqua/30 text-primary",
  },
  {
    Icono: IconEscudo,
    titulo: "El cliente lo aprueba",
    texto: "El dinero solo se mueve cuando quien paga lo aprueba en su wallet.",
    tono: "bg-primary/12 text-primary",
  },
  {
    Icono: IconMundo,
    titulo: "Cualquier moneda",
    texto: "Un turista paga en su moneda, ve la tasa antes y tú recibes pesos.",
    tono: "bg-aqua/20 text-tinta",
  },
];

/** Ventajas de cobrar con Open Payments (columna junto al código de pago vacío). */
export function VentajasOpenPayments() {
  return (
    <ul className="web-escalonado flex flex-col justify-center gap-6">
      {VENTAJAS.map(({ Icono, titulo, texto, tono }) => (
        <li key={titulo} className="flex items-start gap-4">
          <span
            className={`grid size-12 shrink-0 place-items-center rounded-full ${tono}`}
          >
            <Icono width={22} height={22} />
          </span>
          <span>
            <span className="block text-web-sm font-bold text-tinta">
              {titulo}
            </span>
            <span className="block text-web-xs text-ink/60">{texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
