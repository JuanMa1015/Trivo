import { connection } from "next/server";
import { problemasDeConfiguracion } from "@/server/configuracion";
import { json } from "@/server/http";

let avisado = false;

/**
 * Salud para Docker y el despliegue. No toca la base de datos a propósito, pero sí revisa
 * la configuración: con un secreto, una llave o un PIN mal puestos responde 503, así el
 * despliegue falla (y vuelve a la versión anterior) en vez de dejar un pago a medias.
 * El detalle va al registro del servidor, no a la respuesta pública.
 */
export async function GET() {
  await connection();
  const problemas = problemasDeConfiguracion();
  if (problemas.length > 0) {
    if (!avisado) {
      avisado = true;
      console.error(
        "Configuración inválida, el servidor no está listo:\n- " +
          problemas.join("\n- "),
      );
    }
    return json({ status: "config_invalida" }, 503);
  }
  return json({ status: "ok" });
}
