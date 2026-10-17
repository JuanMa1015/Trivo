import { describe, expect, it } from "vitest";
import { problemasDeConfiguracion } from "./configuracion";

const buena = {
  COBROS_STORE: "postgres",
  DATABASE_URL: "postgresql://x",
  COBROS_RAIL: "open-payments",
  APP_BASE_URL: "http://104.225.223.220:9028",
  CONFIRMACION_SECRETO: "a".repeat(64),
  OPEN_PAYMENTS_CLIENT_WALLET_URL: "https://ilp.interledger-test.dev/test-open",
  OPEN_PAYMENTS_KEY_ID: "376a76e0-8c57-4eb6-acbe-a87df3fd3282",
  OPEN_PAYMENTS_PRIVATE_KEY_PATH: "/run/secrets/open_payments.key",
  VENDEDOR_PIN: "clave-larga-1",
};
const conLlave = () => true;

describe("problemasDeConfiguracion", () => {
  it("no encuentra nada en una configuración completa", () => {
    expect(problemasDeConfiguracion(buena, conLlave)).toEqual([]);
  });

  it("en demo no exige nada del riel real", () => {
    expect(problemasDeConfiguracion({ COBROS_RAIL: "demo" }, conLlave)).toEqual(
      [],
    );
  });

  it("con postgres exige DATABASE_URL", () => {
    const sin: Record<string, string> = { ...buena };
    delete sin.DATABASE_URL;
    expect(problemasDeConfiguracion(sin, conLlave).join()).toMatch(
      /DATABASE_URL/,
    );
  });

  it("detecta el secreto corto o con texto de ejemplo (el fallo del servidor)", () => {
    const corto = problemasDeConfiguracion(
      { ...buena, CONFIRMACION_SECRETO: "corto" },
      conLlave,
    );
    expect(corto.join()).toMatch(/CONFIRMACION_SECRETO/);
    const ejemplo = problemasDeConfiguracion(
      { ...buena, CONFIRMACION_SECRETO: "<64 caracteres hex>" },
      conLlave,
    );
    expect(ejemplo.join()).toMatch(/texto de ejemplo/);
  });

  it("detecta el KeyId de ejemplo o mal escrito (el otro fallo del servidor)", () => {
    expect(
      problemasDeConfiguracion(
        { ...buena, OPEN_PAYMENTS_KEY_ID: "<tu KeyId>" },
        conLlave,
      ).join(),
    ).toMatch(/OPEN_PAYMENTS_KEY_ID/);
    expect(
      problemasDeConfiguracion(
        { ...buena, OPEN_PAYMENTS_KEY_ID: "abc123" },
        conLlave,
      ).join(),
    ).toMatch(/UUID/);
  });

  it("detecta la wallet de ejemplo y el PIN ausente o corto", () => {
    expect(
      problemasDeConfiguracion(
        {
          ...buena,
          OPEN_PAYMENTS_CLIENT_WALLET_URL:
            "https://ilp.interledger-test.dev/your-wallet",
        },
        conLlave,
      ).join(),
    ).toMatch(/texto de ejemplo/);
    expect(
      problemasDeConfiguracion(
        { ...buena, VENDEDOR_PIN: "corta" },
        conLlave,
      ).join(),
    ).toMatch(/VENDEDOR_PIN/);
  });

  it("detecta que el archivo de la llave no está", () => {
    expect(problemasDeConfiguracion(buena, () => false).join()).toMatch(
      /archivo de la llave/,
    );
  });

  it("nunca incluye valores en lo que reporta", () => {
    const texto = problemasDeConfiguracion(
      {
        ...buena,
        CONFIRMACION_SECRETO: "SECRETO-CORTO",
        VENDEDOR_PIN: "PIN-CORTO",
      },
      conLlave,
    ).join("\n");
    expect(texto).not.toContain("SECRETO-CORTO");
    expect(texto).not.toContain("PIN-CORTO");
  });
});
