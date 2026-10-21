"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePerfil } from "@/lib/use-perfil";

const RUTAS_DEL_VENDEDOR = ["/", "/talonario", "/resumen", "/impuestos"];

/**
 * Franja sobre las pantallas del vendedor que le recuerda crear su cuenta hasta que sea
 * obligatoria. Solo aparece donde hay sesión de vendedor: el pagador nunca la ve. En
 * escritorio el recordatorio va dentro de la barra, para no empujar la pantalla.
 */
export function RecordatorioRegistro() {
  const ruta = usePathname();
  const delVendedor =
    RUTAS_DEL_VENDEDOR.includes(ruta) || ruta.startsWith("/cobro/");
  return delVendedor ? <Franja /> : null;
}

function Franja() {
  const { registrado, restantes, cargado } = usePerfil();
  if (!cargado || registrado || restantes === null) return null;
  const ultimo = restantes === 0;

  return (
    <div
      role={ultimo ? "alert" : "status"}
      className={`flex flex-wrap items-center justify-center gap-x-4 lg:hidden gap-y-1 px-4 py-2 text-center text-sm ${
        ultimo ? "bg-error/10 font-bold text-error" : "bg-aqua/25 text-tinta"
      }`}
    >
      <span>
        {ultimo
          ? "Para seguir cobrando necesitas crear tu cuenta."
          : `Estás cobrando sin cuenta: crea la tuya para guardar tus ventas. Te quedan ${restantes} ${restantes === 1 ? "cobro" : "cobros"} antes de que sea obligatorio.`}
      </span>
      <Link
        href={ultimo ? "/registro?obligatorio=1" : "/registro"}
        className="font-bold text-primary underline"
      >
        Crear cuenta
      </Link>
    </div>
  );
}
