"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { IconEscudo } from "@/components/icons";
import { PantallaWeb } from "@/components/web/contenedor";
import { HeroWeb } from "@/components/web/hero-web";
import { LogoTrivo } from "@/components/web/marca";
import { LIMITE_COBROS_SIN_REGISTRO } from "@/lib/perfil";

const MENSAJES: Record<string, string> = {
  usuario_en_uso: "Ese usuario ya existe. Elige otro.",
  ya_registrado: "Ya tienes una cuenta abierta en este dispositivo.",
  demasiadas_solicitudes:
    "Demasiados intentos. Espera un rato e intenta de nuevo.",
  datos_invalidos:
    "Revisa los datos: usuario de 3 a 30 letras o números (sin espacios), comercio de 2 a 60 caracteres, contraseña de 8 o más y la dirección de tu wallet.",
  wallet_invalida:
    "No encontramos esa wallet. Pega su dirección completa, que empieza por https://",
  wallet_no_permitida: "Esa wallet no es de un proveedor compatible todavía.",
  moneda_no_soportada:
    "Por ahora solo se pueden recibir cobros en una wallet en pesos colombianos (COP).",
  open_payments_fallo:
    "No pudimos consultar esa wallet. Intenta de nuevo en un momento.",
};

const TITULO = "Crea tu cuenta";
const AYUDA = "Usuario, comercio, contraseña y la wallet donde cobras.";

type Estado = { registrado: boolean; cobrosCreados: number } | null;

export function RegistroForm() {
  const router = useRouter();
  const obligatorio = useSearchParams().get("obligatorio") === "1";
  const [estado, setEstado] = useState<Estado>(null);
  const [usuario, setUsuario] = useState("");
  const [comercio, setComercio] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");
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

  const completo =
    usuario.trim().length >= 3 &&
    comercio.trim().length >= 2 &&
    password.length >= 8 &&
    wallet.trim().length >= 8;

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
          wallet,
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

  const previos = estado?.cobrosCreados ?? 0;
  const aviso = obligatorio
    ? `Llegaste a ${LIMITE_COBROS_SIN_REGISTRO} cobros: para seguir cobrando, crea tu cuenta. Conservas los que ya hiciste.`
    : previos > 0
      ? `Tus ${previos === 1 ? "cobro" : `${previos} cobros`} de hasta ahora se quedan en tu cuenta.`
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
        <Campo etiqueta="Tu wallet para cobrar (en COP)" clase={etiqueta}>
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="https://ilp.interledger-test.dev/tu-wallet"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            maxLength={300}
            className={caja}
          />
        </Campo>
      </>
    );
  };

  if (estado?.registrado) return <YaRegistrado />;

  return (
    <>
      <PantallaWeb
        nav={
          <header className="nav-web flex h-16 items-center px-6">
            <LogoTrivo />
          </header>
        }
        hero={
          <HeroWeb
            insignia="Tu cuenta"
            IconoInsignia={IconEscudo}
            titulo={TITULO}
            subtitulo={AYUDA}
          />
        }
      >
        <form
          className="tarjeta-web web-paso mx-auto w-full max-w-140 text-web-sm lg:max-w-180"
          onSubmit={registrar}
        >
          {/* En escritorio los campos van en dos columnas: el formulario cabe sin scroll. */}
          <div className="grid grid-cols-1 gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5">
            {campos(true)}
          </div>
          <div className="perforacion-web mx-4 sm:mx-6" />
          <div className="flex flex-col gap-4 px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-6">
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
                Inicia sesión
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

function YaRegistrado() {
  return (
    <PantallaWeb
      nav={
        <header className="nav-web flex h-16 items-center px-4 lg:px-6">
          <LogoTrivo />
        </header>
      }
      hero={
        <HeroWeb
          insignia="Tu cuenta"
          IconoInsignia={IconEscudo}
          titulo="Ya tienes cuenta"
          subtitulo="Ya tienes una cuenta abierta en este dispositivo."
        />
      }
    >
      <section className="tarjeta-web mx-auto flex w-full max-w-140 flex-col gap-5 p-5 text-web-sm sm:p-8">
        <p className="text-ink/70">
          Para crear otra cuenta, sal de esta primero desde el menú de tu
          usuario.
        </p>
        <Link href="/" className="boton-web">
          Volver a cobrar
        </Link>
      </section>
    </PantallaWeb>
  );
}
