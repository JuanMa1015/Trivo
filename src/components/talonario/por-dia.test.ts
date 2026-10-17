import { describe, expect, it } from "vitest";
import { agruparPorDia, cobrosDeHoy, tituloDelDia } from "./por-dia";

const ahora = new Date(2026, 9, 14, 15, 0);
const en = (dia: number, hora = 10) =>
  new Date(2026, 9, dia, hora, 30).toISOString();

describe("talonario por día", () => {
  it("separa hoy, ayer y días anteriores sin cambiar el orden", () => {
    const cobros = [
      { numero: 4, creadoEn: en(14, 12) },
      { numero: 3, creadoEn: en(14, 9) },
      { numero: 2, creadoEn: en(13) },
      { numero: 1, creadoEn: en(10) },
    ];
    const grupos = agruparPorDia(cobros, ahora);
    expect(grupos.map((g) => g.titulo.split(",")[0])).toEqual([
      "Hoy",
      "Ayer",
      "Sábado",
    ]);
    expect(grupos[0].cobros.map((c) => c.numero)).toEqual([4, 3]);
  });

  it("cobrado hoy solo cuenta los cobros de hoy", () => {
    const cobros = [{ creadoEn: en(14) }, { creadoEn: en(13) }];
    expect(cobrosDeHoy(cobros, ahora)).toHaveLength(1);
    expect(cobrosDeHoy([], ahora)).toEqual([]);
  });

  it("los días anteriores llevan la fecha completa", () => {
    expect(tituloDelDia(en(10), ahora)).toMatch(/^Sábado, 10 de octubre$/);
  });
});
