"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { LogoTrivo } from "@/components/web/marca";
import { SoloMovil } from "@/components/web/vista";
import { LIMITE_COBROS_SIN_REGISTRO } from "@/lib/perfil";

const MENSAJES: Record<string, string> = {
  pin_incorrecto: "El PIN no es correcto.",
  ya_registrado: "Este comercio ya tiene una cuenta. Entra con tu PIN.",
  demasiadas_solicitudes: "Demasiados intentos. Espera un minuto.",
  datos_invalidos:
    "Revisa los datos: usuario de 3 a 30 letras o números (sin espacios), comercio de 2 a 60 caracteres y contraseña de 8 o más.",
  acceso_no_configurado:
    "El servidor no tiene PIN de vendedor. Defínelo en VENDEDOR_PIN (mínimo 8 caracteres).",
};

const TITULO = "Crea tu cuenta";
const AYUDA =
  "Solo tres datos: tu usuario, el nombre de tu comercio y una contraseña.";

type Estado = { registrado: boolean; requierePin: boolean } | null;

export function RegistroForm() {
  const router = useRouter();
  const obligatorio = useSearchParams().get("obligatorio") === "1";
  const [estado, setEstado] = useState<Estado>(null);
  const [usuario, setUsuario] = useState("");
  const [comercio, setComercio] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/registro", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((cuerpo: Estado) => {
        if (activo) setEstado(cuerpo);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const requierePin = estado?.requierePin ?? false;
  const completo =
    usuario.trim().length >= 3 &&
    comercio.trim().length >= 2 &&
    password.length >= 8 &&
    (!requierePin || pin.length > 0);

  async function registrar(e: FormEvent) {
    e.preventDefault();
    if (!completo || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario,
          comercio,
          password,
          ...(requierePin ? { pin } : {}),
        }),
      });
      if (r.ok) {
        router.replace("/");
        return;
      }
      const cuerpo = await r.json().catch(() => null);
      setError(
        MENSAJES[cuerpo?.error] ??
          "No pudimos crear la cuenta. Intenta de nuevo.",
      );
    } catch {
      setError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
    }
    setEnviando(false);
  }

  const aviso = obligatorio
    ? `Llegaste a ${LIMITE_COBROS_SIN_REGISTRO} cobros: para seguir cobrando, crea tu cuenta.`
    : null;

  const campos = (web: boolean) => {
    const caja = web ? "campo-web" : "h-14 rounded-2xl bg-neutral px-4 text-lg";
    const etiqueta = web ? "font-bold" : "text-sm font-bold";
    return (
      <>
        <Campo etiqueta="Tu nombre de usuario" clase={etiqueta}>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            maxLength={30}
            className={caja}
          />
        </Campo>
        <Campo etiqueta="Nombre de tu comercio" clase={etiqueta}>
          <input
            value={comercio}
            onChange={(e) => setComercio(e.target.value)}
            autoComplete="organization"
            maxLength={60}
            className={caja}
          />
        </Campo>
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" clase={etiqueta}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={caja}
          />
        </Campo>
        {requierePin ? (
          <Campo etiqueta="PIN del vendedor" clase={etiqueta}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
              className={caja}
            />
          </Campo>
        ) : null}
      </>
    );
  };

  if (estado?.registrado) return <YaRegistrado />;

  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4 lg:hidden">
          <header>
            <LogoTrivo tamano={20} />
          </header>
          <form className="recibo flex flex-col gap-4 p-5" onSubmit={registrar}>
            <h1 className="text-3xl font-bold leading-tight">{TITULO}</h1>
            <p className="text-secondary/70">{AYUDA}</p>
            {aviso ? (
              <p role="status" className="font-bold text-primary">
                {aviso}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="font-bold text-critico">
                {error}
              </p>
            ) : null}
            {campos(false)}
            <button
              type="submit"
              disabled={!completo || enviando}
              className="h-16 rounded-2xl bg-primary text-xl font-bold text-white transition-opacity disabled:opacity-40"
            >
              {enviando ? "Creando…" : "Crear cuenta"}
            </button>
            <p className="text-center text-sm text-secondary/70">
              ¿Ya tienes cuenta?{" "}
              <Link href="/acceso" className="font-bold text-primary">
                Entra con tu PIN
              </Link>
            </p>
          </form>
        </main>
      </SoloMovil>

      <PantallaWeb nav={NAV} hero={heroCuenta(TITULO, AYUDA)}>
        <form
          className="tarjeta-web web-paso mx-auto w-full max-w-180 text-web-sm"
          onSubmit={registrar}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-8">
            {campos(true)}
          </div>
          <div className="perforacion-web mx-6" />
          <div className="flex flex-col gap-4 px-8 pb-8 pt-6">
            {aviso ? (
              <p role="status" className="font-bold text-primary">
                {aviso}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="font-bold text-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!completo || enviando}
              className="boton-web"
            >
              {enviando ? "Creando…" : "Crear cuenta"}
            </button>
            <p className="text-center text-web-xs text-ink/70">
              ¿Ya tienes cuenta?{" "}
              <Link href="/acceso" className="font-bold text-primary">
                Entra con tu PIN
              </Link>
            </p>
          </div>
        </form>
      </PantallaWeb>
    </>
  );
}

function Campo({
  etiqueta,
  clase,
  children,
}: {
  etiqueta: string;
  clase: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={clase}>{etiqueta}</span>
      {children}
    </label>
  );
}

const NAV = (
  <header className="nav-web flex h-16 items-center px-6">
    <Link href="/" aria-label="Ir al inicio">
      <LogoTrivo />
    </Link>
  </header>
);

function heroCuenta(titulo: string, subtitulo: string) {
  return (
    <HeroWeb
      insignia="Tu cuenta"
      IconoInsignia={IconEscudo}
      titulo={titulo}
      subtitulo={subtitulo}
    />
  );
}

function YaRegistrado() {
  const texto = "Este comercio ya está registrado. Entra con tu PIN.";
  return (
    <>
      <SoloMovil>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-4 lg:hidden">
          <header>
            <LogoTrivo tamano={20} />
          </header>
          <section className="recibo flex flex-col gap-4 p-5">
            <h1 className="text-3xl font-bold leading-tight">
              Ya tienes cuenta
            </h1>
            <p className="text-secondary/70">{texto}</p>
            <Link
              href="/acceso"
              className="flex h-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white"
            >
              Entrar
            </Link>
          </section>
        </main>
      </SoloMovil>
      <PantallaWeb nav={NAV} hero={heroCuenta("Ya tienes cuenta", texto)}>
        <section className="tarjeta-web web-paso mx-auto flex w-full max-w-140 flex-col gap-4 p-8 text-web-sm">
          <Link href="/acceso" className="boton-web">
            Entrar
          </Link>
        </section>
      </PantallaWeb>
    </>
  );
}
