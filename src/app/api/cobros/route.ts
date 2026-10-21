import { connection } from "next/server";
import { crearCobroSchema } from "@/lib/cobros";
import { json, leerCuerpo, respuestaDeError } from "@/server/http";
import { demasiadasSolicitudes } from "@/server/http";
import { permitirInvitado } from "@/server/limites";
import { obtenerServicio } from "@/server/servicio";
import { cookieSesion, crearSesion, vendedorDe } from "@/server/vendedor";

/** Los cobros de quien llama: sin sesión todavía no hay ninguno. */
export async function GET(request: Request) {
  await connection();
  try {
    const vendedor = await vendedorDe(request);
    if (!vendedor) return json({ cobros: [] });
    return json({
      cobros: await obtenerServicio().listar(vendedor.comercioId),
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}

/**
 * Crea un cobro. Quien llega sin sesión empieza como invitado (sin PIN ni cuenta) y cobra
 * hasta el límite; después debe crear su cuenta, que conserva lo que ya cobró.
 */
export async function POST(request: Request) {
  await connection();
  const cuerpo = await leerCuerpo(request, crearCobroSchema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const servicio = obtenerServicio();
    const vendedor = await vendedorDe(request);
    if (
      vendedor &&
      !vendedor.perfil.registrado &&
      vendedor.perfil.cobrosCreados >= vendedor.perfil.limite
    )
      return json({ error: "registro_requerido" }, 403);

    let comercioId = vendedor?.comercioId;
    if (!comercioId) {
      if (!permitirInvitado(request)) return demasiadasSolicitudes();
      comercioId = await servicio.crearInvitado();
    }
    const cobro = await servicio.crearCobro(
      comercioId,
      cuerpo.data.monto,
      cuerpo.data.concepto,
    );
    const respuesta = json({ cobro }, 201);
    if (!vendedor)
      respuesta.headers.append(
        "Set-Cookie",
        cookieSesion(crearSesion(comercioId)),
      );
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}
