/**
 * Límite de intentos por clave en ventana fija. Frena la adivinanza de códigos
 * de 6 dígitos. ponytail: en memoria y por proceso; con varias instancias o
 * detrás de un proxy hay que moverlo a Redis/Postgres y confiar solo en la IP
 * que pone el proxy.
 */
export function crearLimitador(max: number, ventanaMs: number) {
  const intentos = new Map<string, { cuenta: number; reinicia: number }>();

  return function permitir(clave: string, ahora: number = Date.now()): boolean {
    const actual = intentos.get(clave);
    if (!actual || ahora >= actual.reinicia) {
      intentos.set(clave, { cuenta: 1, reinicia: ahora + ventanaMs });
      return true;
    }
    actual.cuenta += 1;
    return actual.cuenta <= max;
  };
}

export function ipDe(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  );
}
