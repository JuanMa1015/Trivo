import { describe, expect, it } from "vitest";
import { crearTasaReferencia } from "./tasas";

const respuesta = (cuerpo: unknown, ok = true) =>
  Promise.resolve({ ok, json: async () => cuerpo }) as Promise<Response>;

const tabla = { result: "success", rates: { USD: 1, COP: 3_000, EUR: 0.9 } };

describe("tasa de referencia", () => {
  it("cruza por dólar: cuántos COP vale un EUR", async () => {
    const tasa = crearTasaReferencia(() => respuesta(tabla));
    expect(await tasa("EUR", "COP")).toBeCloseTo(3_333.33, 1);
    expect(await tasa("USD", "COP")).toBe(3_000);
  });

  it("no conoce una moneda: devuelve nulo", async () => {
    const tasa = crearTasaReferencia(() => respuesta(tabla));
    expect(await tasa("XXX", "COP")).toBeNull();
  });

  it("guarda la tabla seis horas y luego la vuelve a pedir", async () => {
    let t = 0;
    let pedidos = 0;
    const tasa = crearTasaReferencia(
      () => {
        pedidos += 1;
        return respuesta(tabla);
      },
      () => t,
    );
    await tasa("USD", "COP");
    await tasa("EUR", "COP");
    expect(pedidos).toBe(1);
    t += 6 * 60 * 60 * 1000 + 1;
    await tasa("USD", "COP");
    expect(pedidos).toBe(2);
  });

  it("si la fuente falla devuelve nulo y reintenta a los 5 minutos, no en cada cotización", async () => {
    let t = 0;
    let pedidos = 0;
    const tasa = crearTasaReferencia(
      () => {
        pedidos += 1;
        return Promise.reject(new Error("sin red"));
      },
      () => t,
    );
    expect(await tasa("USD", "COP")).toBeNull();
    expect(await tasa("USD", "COP")).toBeNull();
    expect(pedidos).toBe(1);
    t += 5 * 60 * 1000 + 1;
    await tasa("USD", "COP");
    expect(pedidos).toBe(2);
  });

  it("una respuesta con error se trata como sin referencia", async () => {
    const tasa = crearTasaReferencia(() =>
      respuesta({ result: "error" }, false),
    );
    expect(await tasa("USD", "COP")).toBeNull();
  });
});
