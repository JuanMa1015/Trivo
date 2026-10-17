import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ErrorPago } from "./errores";
import {
  validarUrlServidor,
  validarUrlWallet,
  verificarHashInteraccion,
} from "./seguridad";

const permitidos = ["ilp.interledger-test.dev"];

describe("validarUrlWallet", () => {
  it("acepta una wallet permitida y la normaliza", () => {
    expect(
      validarUrlWallet(
        "https://ilp.interledger-test.dev/mi-wallet/?x=1#y",
        permitidos,
      ),
    ).toBe("https://ilp.interledger-test.dev/mi-wallet");
  });

  it.each([
    "http://ilp.interledger-test.dev/a",
    "$ilp.interledger-test.dev/a",
    "https://user:pass@ilp.interledger-test.dev/a",
    "https://ilp.interledger-test.dev:8443/a",
    "https://localhost/a",
    "https://127.0.0.1/a",
    "https://169.254.169.254/latest",
    "https://[::1]/a",
    "https://servicio.internal/a",
    "https://sinpunto/a",
  ])("rechaza %s", (url) => {
    expect(() => validarUrlWallet(url)).toThrow(ErrorPago);
  });

  it("rechaza hosts fuera de la lista permitida", () => {
    expect(() =>
      validarUrlWallet("https://otro.example.com/a", permitidos),
    ).toThrowError(expect.objectContaining({ codigo: "wallet_no_permitida" }));
  });

  it("sin lista permitida acepta cualquier host público", () => {
    expect(validarUrlWallet("https://otro.example.com/a")).toBe(
      "https://otro.example.com/a",
    );
  });
});

describe("validarUrlServidor", () => {
  it("acepta servidores https públicos y rechaza internos", () => {
    expect(validarUrlServidor("https://auth.interledger-test.dev/abc/")).toBe(
      "https://auth.interledger-test.dev/abc",
    );
    expect(() => validarUrlServidor("https://10.0.0.5/abc")).toThrow(ErrorPago);
    expect(() => validarUrlServidor("http://auth.example.com/abc")).toThrow(
      ErrorPago,
    );
  });
});

describe("verificarHashInteraccion", () => {
  const datos = {
    nonceCliente: "nonce-del-cliente",
    nonceAs: "NONCE-DEL-AS",
    interactRef: "ref-123",
    authServerUrl: "https://auth.interledger-test.dev/abc",
  };
  const hashDe = (grant: string) =>
    createHash("sha256")
      .update(
        `${datos.nonceCliente}\n${datos.nonceAs}\n${datos.interactRef}\n${grant}`,
      )
      .digest("base64");

  it("acepta el hash real que devolvió la testnet (base64 con relleno)", () => {
    expect(
      verificarHashInteraccion({
        nonceCliente: "008eb890-738d-449f-a82b-f6d200f44b3c",
        nonceAs: "6D826C8183A7355E",
        interactRef: "6e519da1-9f3f-449b-ae0c-c07d310b2aef",
        authServerUrl:
          "https://auth.interledger-test.dev/f537937b-7016-481b-b655-9f0d1014822c",
        hash: "ONLLgVva2U7lPtifWGJhSQIe4bOlZhJx4C4PhqKphKU=",
      }),
    ).toBe(true);
  });

  it("acepta el hash correcto, con o sin barra final en la URL del grant", () => {
    expect(
      verificarHashInteraccion({ ...datos, hash: hashDe(datos.authServerUrl) }),
    ).toBe(true);
    expect(
      verificarHashInteraccion({
        ...datos,
        hash: hashDe(`${datos.authServerUrl}/`),
      }),
    ).toBe(true);
  });

  it("rechaza un hash alterado o de otra interacción", () => {
    expect(verificarHashInteraccion({ ...datos, hash: "xxxx" })).toBe(false);
    expect(
      verificarHashInteraccion({
        ...datos,
        interactRef: "otra",
        hash: hashDe(datos.authServerUrl),
      }),
    ).toBe(false);
    expect(verificarHashInteraccion({ ...datos, hash: "" })).toBe(false);
  });
});
