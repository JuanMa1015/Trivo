import { describe, expect, it } from "vitest";
import {
  avancesDelAnio,
  diasEntre,
  estadoPlazo,
  hoyEnColombia,
  limitesDelAnio,
  limitesDelMes,
  mesAnterior,
  nombreDelPeriodo,
  mesesDeRetraso,
  multaExtemporanea,
  multaPorNoDeclarar,
  plazoRenta,
  sancionMinima,
} from "./impuestos";

describe("plazoRenta (año gravable 2025, calendario DIAN 2026)", () => {
  it.each([
    ["01", "2026-08-12"],
    ["02", "2026-08-12"],
    ["03", "2026-08-13"],
    ["45", "2026-09-14"],
    ["50", "2026-09-16"],
    ["67", "2026-10-01"],
    ["80", "2026-10-09"],
    ["81", "2026-10-13"],
    ["98", "2026-10-23"],
    ["99", "2026-10-26"],
    ["00", "2026-10-26"],
  ])("terminado en %s vence el %s", (digitos, fecha) => {
    expect(plazoRenta(digitos)).toBe(fecha);
  });

  it("rechaza lo que no son dos dígitos", () => {
    for (const malo of ["", "1", "123", "ab", "1a", " 1"])
      expect(plazoRenta(malo)).toBeNull();
  });
});

describe("fechas y plazos", () => {
  it("cuenta días entre fechas", () => {
    expect(diasEntre("2026-10-17", "2026-10-26")).toBe(9);
    expect(diasEntre("2026-10-26", "2026-10-17")).toBe(-9);
  });

  it("usa el día de Colombia, no el de UTC", () => {
    // 03:00 UTC del 17 es todavía el 16 a las 22:00 en Bogotá.
    expect(hoyEnColombia(Date.UTC(2026, 9, 17, 3))).toBe("2026-10-16");
    expect(hoyEnColombia(Date.UTC(2026, 9, 17, 6))).toBe("2026-10-17");
  });

  it("clasifica el plazo", () => {
    expect(estadoPlazo("2026-10-16", "2026-10-17")).toEqual({
      tipo: "vencido",
      dias: 1,
    });
    expect(estadoPlazo("2026-10-17", "2026-10-17")).toEqual({ tipo: "hoy" });
    expect(estadoPlazo("2026-10-26", "2026-10-17")).toEqual({
      tipo: "proximo",
      dias: 9,
    });
    expect(estadoPlazo("2026-12-30", "2026-10-17").tipo).toBe("holgado");
  });

  it("cada mes empezado cuenta como mes de retraso", () => {
    expect(mesesDeRetraso("2026-10-26", "2026-10-17")).toBe(0);
    expect(mesesDeRetraso("2026-08-12", "2026-08-13")).toBe(1);
    expect(mesesDeRetraso("2026-08-12", "2026-09-11")).toBe(1);
    expect(mesesDeRetraso("2026-08-12", "2026-09-12")).toBe(2);
  });

  it("el año calendario va de enero a enero, hora de Colombia", () => {
    const { desde, hasta } = limitesDelAnio(2026);
    expect(new Date(desde).toISOString()).toBe("2026-01-01T05:00:00.000Z");
    expect(new Date(hasta).toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("avance hacia los topes de 2026", () => {
  it("trae los dos topes con su límite en pesos", () => {
    const [facturar, renta] = ["facturacion", "renta-ingresos"].map((id) =>
      avancesDelAnio(0).find((a) => a.id === id)!,
    );
    expect(facturar.limite).toBe(183_309_000);
    expect(renta.limite).toBe(73_323_600);
  });

  it("marca el nivel según lo cobrado", () => {
    const renta = (v: number) =>
      avancesDelAnio(v).find((a) => a.id === "renta-ingresos")!.progreso;
    expect(renta(0).nivel).toBe("ok");
    expect(renta(55_000_000).nivel).toBe("atencion");
    expect(renta(74_000_000).nivel).toBe("superado");
  });
});

describe("sanciones (orientativas)", () => {
  const uvt = 52_374;

  it("ninguna baja de 10 UVT", () => {
    expect(sancionMinima(uvt)).toBe(523_740);
    expect(
      multaExtemporanea({
        ingresos: 80_000_000,
        impuesto: 100_000,
        meses: 1,
        uvt,
      }),
    ).toBe(523_740);
  });

  it("con impuesto: 5 % por mes, sin pasar del 100 %", () => {
    const base = { ingresos: 90_000_000, impuesto: 10_000_000, uvt };
    expect(multaExtemporanea({ ...base, meses: 1 })).toBe(
      500_000 < 523_740 ? 523_740 : 500_000,
    );
    expect(multaExtemporanea({ ...base, meses: 3 })).toBe(1_500_000);
    expect(multaExtemporanea({ ...base, meses: 100 })).toBe(10_000_000);
  });

  it("sin impuesto: 0,5 % de los ingresos por mes, con tope", () => {
    const base = { ingresos: 100_000_000, impuesto: 0, uvt };
    expect(multaExtemporanea({ ...base, meses: 2 })).toBe(1_000_000);
    // Tope: 5 % de los ingresos (5.000.000), por debajo de 2.500 UVT.
    expect(multaExtemporanea({ ...base, meses: 60 })).toBe(5_000_000);
  });

  it("un retraso de 0 o fracción cuenta como un mes", () => {
    const a = multaExtemporanea({
      ingresos: 100_000_000,
      impuesto: 0,
      meses: 0,
      uvt,
    });
    const b = multaExtemporanea({
      ingresos: 100_000_000,
      impuesto: 0,
      meses: 1,
      uvt,
    });
    expect(a).toBe(b);
  });

  it("no declarar tras el emplazamiento: 20 % de los ingresos, mínimo 10 UVT", () => {
    expect(multaPorNoDeclarar(100_000_000, uvt)).toBe(20_000_000);
    expect(multaPorNoDeclarar(1_000_000, uvt)).toBe(523_740);
  });
});

describe("meses", () => {
  it("los límites del mes van en hora de Colombia y diciembre pasa a enero", () => {
    expect(new Date(limitesDelMes("2026-10").desde).toISOString()).toBe(
      "2026-10-01T05:00:00.000Z",
    );
    expect(new Date(limitesDelMes("2026-12").hasta).toISOString()).toBe(
      "2027-01-01T05:00:00.000Z",
    );
  });

  it("mesAnterior retrocede cruzando el cambio de año", () => {
    expect(mesAnterior("2026-10", 0)).toBe("2026-10");
    expect(mesAnterior("2026-10", 1)).toBe("2026-09");
    expect(mesAnterior("2026-02", 3)).toBe("2025-11");
  });

  it("nombra el mes en español", () => {
    expect(nombreDelPeriodo("2026-10")).toBe("octubre de 2026");
  });
});
