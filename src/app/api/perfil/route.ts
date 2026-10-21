import { connection } from "next/server";
import {
  COMERCIO_INVITADO,
  LIMITE_COBROS_SIN_REGISTRO,
  type Perfil,
} from "@/lib/perfil";
import { json, respuestaDeError } from "@/server/http";
import { vendedorDe } from "@/server/vendedor";

const VISITANTE: Perfil = {
  registrado: false,
  comercio: COMERCIO_INVITADO,
  cobrosCreados: 0,
  limite: LIMITE_COBROS_SIN_REGISTRO,
};

/** Usuario y nombre del comercio para las pantallas, y cuántos cobros lleva (aviso de registro). */
export async function GET(request: Request) {
  await connection();
  try {
    return json((await vendedorDe(request))?.perfil ?? VISITANTE);
  } catch (error) {
    return respuestaDeError(error);
  }
}
