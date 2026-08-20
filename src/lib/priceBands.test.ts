import { describe, it, expect } from "vitest";
import { calcularFaixas, validarSoma100 } from "@/components/dashboard/PriceCompetitivenessChart";

const casos: [number, number, number][] = [
  [1, 1, 1], [0, 0, 5], [33.33, 33.33, 33.34], [1e-6, 2e-6, 7e-6],
  [12345.678, 0.001, 9876.54], [7, 0, 0], [0.05, 0.05, 99.9],
];

describe("faixas de preço", () => {
  it("somam exatamente 100 em todos os casos", () => {
    for (const [c, m, e] of casos) {
      const f = calcularFaixas(c, m, e);
      expect(Math.round((f.cheaper! + f.match! + f.expensive!) * 10) / 10).toBe(100);
      expect(f.cheaper!).toBeGreaterThanOrEqual(0);
      expect(f.expensive!).toBeLessThanOrEqual(100);
    }
  });

  it("retorna nulos quando não há volume BPC", () => {
    expect(calcularFaixas(0, 0, 0)).toEqual({ cheaper: null, match: null, expensive: null });
  });

  it("validarSoma100 aponta período quebrado e ignora períodos sem dado", () => {
    expect(
      validarSoma100([
        { key: "ok", cheaper: 30, match: 40, expensive: 30 },
        { key: "vazio", cheaper: null, match: null, expensive: null },
        { key: "quebrado", cheaper: 30, match: 40, expensive: 20 },
      ]),
    ).toEqual(["quebrado"]);
  });
});
