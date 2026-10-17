/*
 * El talonario agrupa los cobros por día (hora local del vendedor). La API entrega los
 * últimos cobros sin importar la fecha; aquí solo se ordenan para leerlos, y el total
 * "Cobrado hoy" suma únicamente los de hoy. Sin cobros no se consulta la hora, así nada
 * de esto corre al prerenderizar (los cobros llegan después, por el sondeo).
 */

type ConFecha = { creadoEn: string };

/** Día local (AAAA-MM-DD) de una fecha. */
export function diaDe(fecha: string | Date): string {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "Hoy", "Ayer" o la fecha completa ("Lunes, 12 de octubre"). */
export function tituloDelDia(fecha: string, ahora: Date): string {
  const dia = diaDe(fecha);
  if (dia === diaDe(ahora)) return "Hoy";
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (dia === diaDe(ayer)) return "Ayer";
  const texto = new Date(fecha).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export type GrupoDelDia<T> = { dia: string; titulo: string; cobros: T[] };

/** Grupos en el orden en que llegan los cobros (el más reciente primero). */
export function agruparPorDia<T extends ConFecha>(
  cobros: readonly T[],
  ahora?: Date,
): GrupoDelDia<T>[] {
  if (cobros.length === 0) return [];
  const referencia = ahora ?? new Date();
  const grupos = new Map<string, GrupoDelDia<T>>();
  for (const c of cobros) {
    const dia = diaDe(c.creadoEn);
    let grupo = grupos.get(dia);
    if (!grupo) {
      grupo = { dia, titulo: tituloDelDia(c.creadoEn, referencia), cobros: [] };
      grupos.set(dia, grupo);
    }
    grupo.cobros.push(c);
  }
  return [...grupos.values()];
}

/** Solo los cobros creados hoy. */
export function cobrosDeHoy<T extends ConFecha>(
  cobros: readonly T[],
  ahora?: Date,
): T[] {
  if (cobros.length === 0) return [];
  const hoy = diaDe(ahora ?? new Date());
  return cobros.filter((c) => diaDe(c.creadoEn) === hoy);
}
