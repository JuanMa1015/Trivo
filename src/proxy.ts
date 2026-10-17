import { NextResponse, type NextRequest } from "next/server";
import {
  accesoRequerido,
  COOKIE_VENDEDOR,
  sesionValida,
} from "@/server/vendedor";

/**
 * Lleva al vendedor sin sesión a la pantalla de acceso. Es solo comodidad: la API del
 * vendedor vuelve a comprobar la sesión por su cuenta, así que saltarse esto no da datos.
 * El pagador (/p, /pagar, /api/pago) no pasa por aquí.
 */
export function proxy(request: NextRequest) {
  if (
    !accesoRequerido() ||
    sesionValida(request.cookies.get(COOKIE_VENDEDOR)?.value)
  ) {
    return NextResponse.next();
  }
  const destino = request.nextUrl.clone();
  destino.pathname = "/acceso";
  destino.search = "";
  return NextResponse.redirect(destino);
}

export const config = { matcher: ["/", "/cobro/:path*"] };
