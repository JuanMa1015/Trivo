import { ViewTransition, type ReactNode } from "react";

/**
 * Pantalla: barra superior, hero y el contenido debajo, en un contenedor centrado. En el
 * celular todo va en una columna y la navegación pasa a la barra inferior (la pone
 * `NavComercio`, por eso hay aire abajo). Al cambiar de sección el contenido hace
 * crossfade; la barra y el hero quedan quietos.
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
    <div className="mx-auto flex w-full max-w-420 flex-1 flex-col gap-(--separacion) px-3 pb-28 pt-3 text-ink sm:px-5 lg:px-8 lg:pb-(--separacion) lg:pt-4 2xl:px-12">
      {nav}
      {hero}
      <ViewTransition enter="contenido-web" exit="contenido-web" default="none">
        <main className="flex flex-1 flex-col gap-(--separacion)">
          {children}
        </main>
      </ViewTransition>
    </div>
  );
}

/** Dos columnas de la misma altura: 5/12 a la izquierda y 7/12 a la derecha. */
export function DosColumnasWeb({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-1 items-stretch gap-(--separacion) lg:grid-cols-[5fr_7fr]">
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
        <h2 className="line-clamp-2 text-cuerpo font-bold text-tinta lg:truncate">
          {titulo}
        </h2>
        {subtitulo ? (
          <p className="line-clamp-2 text-web-xs text-ink/70 lg:truncate">
            {subtitulo}
          </p>
        ) : null}
      </div>
      {acciones ? (
        <div className="flex items-center gap-2">{acciones}</div>
      ) : null}
    </header>
  );
}
