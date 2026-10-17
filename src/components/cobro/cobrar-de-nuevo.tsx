"use client";

import { useRouter } from "next/navigation";
import { IconRepetir } from "@/components/icons";
import { repetirCobro } from "@/components/cobro/repetir-cobro";
import { pesosWeb } from "@/components/web/formato";

/** Segundos finales en los que el cobro avisa que está por vencer. */
export const AVISO_VENCE_S = 60;

/**
 * Vuelve a Cobrar con el monto y el concepto del cobro que venció o falló, listos
 * para tocar "Cobrar". No crea nada por su cuenta.
 */
export function CobrarDeNuevo({
  monto,
  concepto,
  className,
}: {
  monto: number;
  concepto: string;
  className: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        repetirCobro({ monto, concepto });
        router.push("/");
      }}
      className={className}
    >
      <IconRepetir width={20} height={20} />
      Cobrar de nuevo {pesosWeb(monto)}
    </button>
  );
}
