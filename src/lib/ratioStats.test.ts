import { describe, it, expect } from "vitest";
import {
  calculateRoas,
  calculateAcos,
  calculateTacos,
  calcularEstatisticaRazoes,
} from "./ratioStats";

describe("calculateRoas / calculateAcos / calculateTacos", () => {
  it("returns ratio of totals for positive denominators", () => {
    expect(calculateRoas(200, 50)).toBe(4);
    expect(calculateAcos(50, 200)).toBe(25);
    expect(calculateTacos(50, 1000)).toBe(5);
  });

  it("returns null when denominator is zero or invalid", () => {
    expect(calculateRoas(100, 0)).toBeNull();
    expect(calculateAcos(10, 0)).toBeNull();
    expect(calculateTacos(10, 0)).toBeNull();
    expect(calculateRoas(100, NaN)).toBeNull();
  });

  it("ratio of totals differs from mean of ratios", () => {
    // seller A: inv 10, pads 20 → roas 2; seller B: inv 90, pads 180 → roas 2
    // equal mean; different weights still same — use unequal ratios:
    // A: 10/10=1; B: 90/30=3 → mean=2; totals=100/40=2.5
    const meanOfRatios = (1 + 3) / 2;
    const ratioOfTotals = calculateRoas(10 + 90, 10 + 30);
    expect(meanOfRatios).toBe(2);
    expect(ratioOfTotals).toBe(2.5);
  });
});

describe("calcularEstatisticaRazoes", () => {
  it("uses TGMV (not GMV) for TACOS and null when no investment", () => {
    const stats = calcularEstatisticaRazoes([
      { inv: 100, tgmvPads: 400, tgmv: 2000 },
      { inv: 0, tgmvPads: 0, tgmv: 500 },
    ]);
    expect(stats.roasAgregado).toBe(4);
    expect(stats.acosAgregado).toBe(25);
    expect(stats.tacosAgregado).toBeCloseTo(100 / 2500 * 100, 10);
    expect(stats.nSemInvestimento).toBe(1);
  });
});
