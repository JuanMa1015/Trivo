import { connection } from "next/server";
import { json, respuestaDeError } from "@/server/http";
import { obtenerServicio } from "@/server/servicio";
import { exigirVendedor } from "@/server/vendedor";

/** Usuario y nombre del comercio para las pantallas, y cuántos cobros lleva (aviso de registro). */
export async function GET(request: Request) {
  await connection();
  const rechazo = exigirVendedor(request);
  if (rechazo) return rechazo;
  try {
    return json(await obtenerServicio().perfil());
  } catch (error) {
    return respuestaDeError(error);
  }
}
