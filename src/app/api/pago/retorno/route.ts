import { connection } from "next/server";
import { z } from "zod";
import { demasiadasSolicitudes } from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { obtenerServicio } from "@/server/servicio";

const permitirRetorno = crearLimitador(30, 60_000);
const intentoSchema = z.uuid();

function redirigir(request: Request, ruta: string): Response {
  const base = process.env.APP_BASE_URL ?? request.url;
  return Response.redirect(new URL(ruta, base), 303);
}

/**
 * A donde la wallet del pagador devuelve su navegador tras el consentimiento
 * (GNAP `finish`). Verifica el hash, crea el pago y manda al pagador de vuelta
 * a su pantalla. Nunca muestra detalles del error: solo un código.
 */
export async function GET(request: Request) {
  await connection();
  if (!permitirRetorno(ipDe(request))) return demasiadasSolicitudes();

  const params = new URL(request.url).searchParams;
  const intentoId = intentoSchema.safeParse(params.get("i"));
  if (!intentoId.success)
    return redirigir(request, "/pagar?e=intento_no_encontrado");

  try {
    const { token, error } = await obtenerServicio().completarRetorno(
      intentoId.data,
      {
        interactRef: params.get("interact_ref") ?? undefined,
        hash: params.get("hash") ?? undefined,
      },
    );
    if (!token)
      return redirigir(request, `/pagar?e=${error ?? "intento_no_encontrado"}`);
    return redirigir(request, error ? `/p/${token}?e=${error}` : `/p/${token}`);
  } catch (error) {
    console.error("error al completar el retorno de Open Payments", error);
    return redirigir(request, "/pagar?e=open_payments_fallo");
  }
}
