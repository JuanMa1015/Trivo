import { describe, expect, it } from "vitest";
import type { Estado } from "@/lib/cobros";
import { calcularResumen, indiceDia } from "./calcular-resumen";

// Viernes 16 de octubre de 2026, 10:00 hora local. La semana empieza el lunes 12.
const AHORA = new Date(2026, 9, 16, 10, 0);

function cobro(
  estado: Estado,
  monto: number,
  creado: Date,
  pagado?: Date,
): {
  estado: Estado;
  monto: number;
  creadoEn: string;
  pagadoEn?: string;
} {
  return {
    estado,
    monto,
    creadoEn: creado.toISOString(),
    pagadoEn: pagado?.toISOString(),
  };
}

describe("indiceDia", () => {
  it("cuenta desde el lunes", () => {
    expect(indiceDia(new Date(2026, 9, 12))).toBe(0);
    expect(indiceDia(AHORA)).toBe(4);
    expect(indiceDia(new Date(2026, 9, 18))).toBe(6);
  });
});

describe("calcularResumen", () => {
  it("sin cobros todo queda en cero y no hay mejor día", () => {
    const r = calcularResumen([], AHORA);
    expect(r.semana.total).toBe(0);
    expect(r.semana.dias).toHaveLength(7);
    expect(r.mejorDia).toBeNull();
    expect(r.promedio).toBe(0);
    expect(r.indiceHoy).toBe(4);
  });

  it("suma solo lo cobrado de esta semana y separa lo de hoy", () => {
    const r = calcularResumen(
      [
        cobro("cobrado", 50_000, new Date(2026, 9, 16, 9, 0)),
        cobro("cobrado", 30_000, new Date(2026, 9, 14, 12, 0)),
        cobro("cobrado", 90_000, new Date(2026, 9, 17, 0, 0)), // sábado: aún en la semana
        cobro("cobrado", 70_000, new Date(2026, 9, 11, 18, 0)), // domingo anterior
        cobro("vencido", 20_000, new Date(2026, 9, 16, 8, 0)),
        cobro("esperando", 15_000, new Date(2026, 9, 15, 8, 0)),
        cobro("procesando", 12_000, new Date(2026, 9, 16, 9, 30)),
      ],
      AHORA,
    );

    expect(r.semana.total).toBe(170_000);
    expect(r.semana.cobros).toBe(3);
    expect(r.semana.dias[2]).toEqual({ total: 30_000, cobros: 1 });
    expect(r.hoy).toEqual({ total: 50_000, cobros: 1, vencidos: 1 });
    expect(r.esperando).toBe(1);
    expect(r.mejorDia).toBe(5);
    expect(r.promedio).toBe(56_667);
  });

  it("un cobro cuenta el día en que se pagó", () => {
    const r = calcularResumen(
      [
        cobro(
          "cobrado",
          40_000,
          new Date(2026, 9, 15, 23, 58),
          new Date(2026, 9, 16, 0, 1),
        ),
      ],
      AHORA,
    );
    expect(r.hoy.total).toBe(40_000);
    expect(r.semana.dias[3].total).toBe(0);
  });
});
