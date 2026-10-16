import { connection } from "next/server";
import { resolverSchema } from "@/lib/cobros";
import {
  demasiadasSolicitudes,
  json,
  leerCuerpo,
  noEncontrado,
  respuestaDeError,
} from "@/server/http";
import { crearLimitador, ipDe } from "@/server/rate-limit";
import { obtenerServicio } from "@/server/servicio";

// El código de 6 dígitos tiene un millón de combinaciones: es lo único adivinable del
// sistema, así que se limita fuerte. Con 8 intentos por minuto, barrer todo el espacio
// desde una sola IP tomaría más de 85 días, y los cobros activos duran 10 minutos.
const permitirResolver = crearLimitador(8, 60_000);

/**
 * Convierte el código de 6 dígitos (para decirlo en voz alta) en el token del cobro.
 * El código no abre el pago por sí mismo: solo ayuda a encontrar el token.
 */
export async function POST(request: Request) {
  await connection();
  if (!permitirResolver(ipDe(request))) return demasiadasSolicitudes();
  const cuerpo = await leerCuerpo(request, resolverSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const token = await obtenerServicio().resolverCodigo(cuerpo.data.codigo);
    return token ? json({ token }) : noEncontrado();
  } catch (error) {
    return respuestaDeError(error);
  }
}
