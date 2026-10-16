import { expect, it } from "vitest";
import { formatearPesos } from "./format";

it("formatea pesos colombianos sin decimales", () => {
  expect(formatearPesos(183_309_000)).toMatch(/183\.309\.000/);
});
