import { describe, it, expect } from "vitest";
import { calcularTendencia } from "./tendencia";

describe("calcularTendencia", () => {
  it("série subindo é crescendo", () => {
    expect(calcularTendencia([10, 12, 14, 16, 18])?.sentido).toBe("crescendo");
  });
  it("série caindo é caindo", () => {
    expect(calcularTendencia([18, 16, 14, 12, 10])?.sentido).toBe("caindo");
  });
  it("variação menor que 5% da média é estável", () => {
    expect(calcularTendencia([100, 101, 100, 102, 101])?.sentido).toBe("estavel");
  });
  it("menos de 3 pontos não tem tendência", () => {
    expect(calcularTendencia([1, 2])).toBeNull();
  });
});
