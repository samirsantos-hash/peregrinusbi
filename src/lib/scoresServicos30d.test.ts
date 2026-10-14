import { describe, it, expect } from "vitest";
import { scoresServicos30d } from "./scoresServicos30d";

describe("scoresServicos30d", () => {
  it("investir 3% do faturamento em 30 dias = 100 pts", () => {
    const r = scoresServicos30d([{ date: "2026-10-10", gmv: 1000, adsInvestment: 30 }]);
    expect(r?.scorePads).toBe(100);
  });
  it("investir 1,5% = 50 pts", () => {
    expect(scoresServicos30d([{ date: "2026-10-10", gmv: 1000, adsInvestment: 15 }])?.scorePads).toBe(50);
  });
  it("ignora dias fora da janela de 30 dias", () => {
    const r = scoresServicos30d([
      { date: "2026-08-01", gmv: 1000, adsInvestment: 1000 },
      { date: "2026-10-10", gmv: 1000, adsInvestment: 0, tgmvFull: 778 },
    ]);
    expect(r?.scorePads).toBe(0);
    expect(r?.pctFull).toBeCloseTo(0.778);
  });
});
