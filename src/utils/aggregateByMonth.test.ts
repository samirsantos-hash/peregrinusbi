import { describe, it, expect } from "vitest";
import { aggregateKpisByMonth } from "./aggregateByMonth";

describe("aggregateKpisByMonth", () => {
  it("computes ROAS/ACOS/TACOS as ratios of totals", () => {
    const out = aggregateKpisByMonth([
      {
        date: "2026-01-05",
        gmv: 100,
        tgmv: 100,
        tgmvPads: 20,
        adsInvestment: 10,
        roas: 2,
        acos: 50,
        tacos: 10,
      },
      {
        date: "2026-01-20",
        gmv: 300,
        tgmv: 300,
        tgmvPads: 120,
        adsInvestment: 30,
        roas: 4,
        acos: 25,
        tacos: 10,
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].adsInvestment).toBe(40);
    expect(out[0].tgmvPads).toBe(140);
    expect(out[0].roas).toBe(3.5); // 140/40, not mean 3
    expect(out[0].acos).toBe(40 / 140 * 100);
    expect(out[0].tacos).toBe(40 / 400 * 100);
  });
});
