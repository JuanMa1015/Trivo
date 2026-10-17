import { ViewTransition, type ReactNode } from "react";
import { SoloEscritorio } from "@/components/web/vista";

/**
 * Pantalla de escritorio: barra superior, hero y el contenido debajo, en un
 * contenedor centrado. Solo se ve desde lg (y solo se dibuja cuando se ve).
 * Al cambiar de sección el contenido hace crossfade; la barra y el hero quedan quietos.
 */
export function PantallaWeb({
  nav,
  hero,
  children,
}: {
  nav: ReactNode;
  hero: ReactNode;
  children: ReactNode;
}) {
  return (
    <SoloEscritorio>
      <div className="mx-auto hidden w-full max-w-360 flex-1 flex-col gap-(--separacion) px-8 pb-(--separacion) pt-4 text-ink lg:flex">
        {nav}
        {hero}
        <ViewTransition
          enter="contenido-web"
          exit="contenido-web"
          default="none"
        >
          <main className="flex flex-1 flex-col gap-(--separacion)">
            {children}
          </main>
        </ViewTransition>
      </div>
    </SoloEscritorio>
  );
}

/** Dos columnas de la misma altura: 5/12 a la izquierda y 7/12 a la derecha. */
export function DosColumnasWeb({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-[5fr_7fr] items-stretch gap-(--separacion)">
      {children}
    </div>
  );
}

/** Aviso a todo el ancho, encima de las tarjetas (sin conexión, errores). */
export function AvisoWeb({
  children,
  tono = "normal",
}: {
  children: ReactNode;
  tono?: "normal" | "error";
}) {
  return (
    <p
      role={tono === "error" ? "alert" : "status"}
      className={`tarjeta-web web-subir flex min-h-12 items-center px-6 text-web-sm ${
        tono === "error" ? "font-bold text-error" : "text-tinta"
      }`}
    >
      {children}
    </p>
  );
}

/** Encabezado de tarjeta: baldosa con ícono, título y subtítulo, y acciones a la derecha. */
export function EncabezadoTarjeta({
  icono,
  titulo,
  subtitulo,
  acciones,
}: {
  icono?: ReactNode;
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-4">
      {icono ? <span className="baldosa-web">{icono}</span> : null}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-cuerpo font-bold text-tinta">{titulo}</h2>
        {subtitulo ? (
          <p className="truncate text-web-xs text-ink/60">{subtitulo}</p>
        ) : null}
      </div>
      {acciones ? (
        <div className="flex items-center gap-2">{acciones}</div>
      ) : null}
    </header>
  );
}
