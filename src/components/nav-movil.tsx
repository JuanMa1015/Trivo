import Link from "next/link";
import { SECCIONES, type SeccionWeb } from "@/components/web/nav-web";

/**
 * Navegación del vendedor en móvil: Cobrar, Talonario y Resumen en una barra fija
 * abajo, al alcance del pulgar. Desde lg la reemplaza la barra superior.
 */
export function NavMovil({ seccion }: { seccion: SeccionWeb }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md justify-around rounded-full bg-white p-1.5 shadow-lg ring-1 ring-black/5">
        {SECCIONES.map(({ id, href, texto, Icono }) => {
          const activa = id === seccion;
          return (
            <li key={id} className="flex-1">
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-bold transition-colors ${
                  activa ? "bg-primary text-white" : "text-secondary/70"
                }`}
              >
                <Icono width={20} height={20} />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
