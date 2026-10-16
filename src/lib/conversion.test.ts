import { expect, it } from "vitest";
import { copAUsd } from "./conversion";

it("convierte pesos a dólares con dos decimales", () => {
  expect(copAUsd(50_000)).toBe(15.74);
  expect(copAUsd(31_767.87)).toBe(10);
});
