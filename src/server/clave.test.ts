import { describe, expect, it } from "vitest";
import { claveCorrecta, hashClave } from "./clave";

describe("contraseña", () => {
  it("el hash no contiene la clave y cada vez es distinto (sal propia)", () => {
    const a = hashClave("mi-clave-segura");
    const b = hashClave("mi-clave-segura");
    expect(a).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(a).not.toContain("mi-clave-segura");
    expect(a).not.toBe(b);
  });

  it("acepta la clave correcta y rechaza cualquier otra", () => {
    const hash = hashClave("mi-clave-segura");
    expect(claveCorrecta("mi-clave-segura", hash)).toBe(true);
    expect(claveCorrecta("mi-clave-segurA", hash)).toBe(false);
    expect(claveCorrecta("", hash)).toBe(false);
  });

  it("un hash mal formado nunca deja pasar", () => {
    for (const malo of [
      "",
      "x",
      "scrypt$",
      "scrypt$a$",
      "md5$a$b",
      "scrypt$$b",
    ])
      expect(claveCorrecta("lo-que-sea", malo)).toBe(false);
  });
});
