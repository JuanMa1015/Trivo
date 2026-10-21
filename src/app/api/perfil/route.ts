import { connection } from "next/server";
import {
  COMERCIO_INVITADO,
  LIMITE_COBROS_SIN_REGISTRO,
  type Perfil,
} from "@/lib/perfil";
import { json, respuestaDeError } from "@/server/http";
import { vendedorDe } from "@/server/vendedor";

/** Visitante sin sesión: un comercio nuevo que empieza ahora. */
const visitante = (): Perfil => ({
  registrado: false,
  comercio: COMERCIO_INVITADO,
  cobrosCreados: 0,
  limite: LIMITE_COBROS_SIN_REGISTRO,
  creadoEn: new Date().toISOString(),
});

/** Usuario y nombre del comercio para las pantallas, y cuántos cobros lleva (aviso de registro). */
export async function GET(request: Request) {
  await connection();
  try {
    return json((await vendedorDe(request))?.perfil ?? visitante());
  } catch (error) {
    return respuestaDeError(error);
  }
}
