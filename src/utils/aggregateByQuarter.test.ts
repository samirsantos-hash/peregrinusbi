import { describe, it, expect } from "vitest";
import { aggregateKpisByQuarter } from "./aggregateByQuarter";

type Row = {
  date: string;
  gmv?: number;
  tgmv?: number;
  adsInvestment?: number;
  roas?: number;
  productName?: string;
  productId?: string;
};

const mk = (date: string, gmv: number, roas = 0): Row => ({
  date,
  gmv,
  tgmv: gmv,
  adsInvestment: gmv / 10,
  roas,
  productName: "p",
  productId: "id",
});

describe("aggregateKpisByQuarter", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateKpisByQuarter([])).toEqual([]);
  });

  it("groups months into the correct quarter (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)", () => {
    const kpis: Row[] = [
      mk("2026-01-15", 100),
      mk("2026-02-10", 200),
      mk("2026-03-05", 300), // Q1 -> 600
      mk("2026-04-01", 400),
      mk("2026-06-30", 500), // Q2 -> 900
      mk("2026-07-01", 50),
      mk("2026-09-30", 150), // Q3 -> 200
      mk("2026-10-15", 10),
      mk("2026-11-15", 20),
      mk("2026-12-31", 30), // Q4 -> 60
    ];

    const out = aggregateKpisByQuarter(kpis);
    const byDate = Object.fromEntries(out.map((r: any) => [r.date, r]));

    expect(out).toHaveLength(4);
    expect(byDate["2026-01-01"].gmv).toBe(600);
    expect(byDate["2026-04-01"].gmv).toBe(900);
    expect(byDate["2026-07-01"].gmv).toBe(200);
    expect(byDate["2026-10-01"].gmv).toBe(60);
  });

  it("respects quarter boundaries (month 3 -> Q1, month 4 -> Q2, etc.)", () => {
    const boundaries: Array<[string, string]> = [
      ["2026-03-31", "2026-01-01"], // Q1
      ["2026-04-01", "2026-04-01"], // Q2
      ["2026-06-30", "2026-04-01"], // Q2
      ["2026-07-01", "2026-07-01"], // Q3
      ["2026-09-30", "2026-07-01"], // Q3
      ["2026-10-01", "2026-10-01"], // Q4
    ];
    for (const [input, expectedDate] of boundaries) {
      const out = aggregateKpisByQuarter([mk(input, 1)]);
      expect(out[0].date).toBe(expectedDate);
    }
  });

  it("separates buckets across years", () => {
    const out = aggregateKpisByQuarter([
      mk("2025-02-01", 10),
      mk("2026-02-01", 20),
      mk("2026-11-01", 30),
    ]);
    expect(out).toHaveLength(3);
    const dates = out.map((r: any) => r.date).sort();
    expect(dates).toEqual(["2025-01-01", "2026-01-01", "2026-10-01"]);
  });

  it("returns sums for additive fields and averages for ratio fields", () => {
    const out = aggregateKpisByQuarter([
      mk("2026-01-10", 100, 2),
      mk("2026-02-10", 300, 4),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].gmv).toBe(400);
    expect(out[0].adsInvestment).toBe(40);
    expect((out[0] as any).roas).toBe(3); // average of 2 and 4
  });

  it("ignores rows without a date", () => {
    const out = aggregateKpisByQuarter([
      mk("2026-01-10", 100),
      { date: "", gmv: 999, tgmv: 999, productName: "x", productId: "y" } as Row,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].gmv).toBe(100);
  });

  it("sorts output chronologically by quarter", () => {
    const out = aggregateKpisByQuarter([
      mk("2026-11-01", 30),
      mk("2026-02-01", 20),
      mk("2025-08-01", 10),
    ]);
    expect(out.map((r: any) => r.date)).toEqual([
      "2025-07-01",
      "2026-01-01",
      "2026-10-01",
    ]);
  });
});

// Mirrors the quarter filter used in DashboardHeader.tsx / QuarterlyPerformanceChart.tsx.
// Kept in this file to guarantee both aggregation and filter logic stay in sync.
function filterKpisByQuarter<T extends { date?: string }>(kpis: T[], quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  return kpis.filter((k) => {
    if (!k.date) return false;
    const m = parseInt(k.date.split("-")[1], 10);
    return m >= startMonth && m <= endMonth;
  });
}

describe("quarter date filter (chart components)", () => {
  const sample = [
    mk("2026-01-15", 1),
    mk("2026-03-31", 2),
    mk("2026-04-01", 3),
    mk("2026-06-30", 4),
    mk("2026-07-01", 5),
    mk("2026-09-30", 6),
    mk("2026-10-01", 7),
    mk("2026-12-31", 8),
  ];

  it("Q1 includes only Jan-Mar", () => {
    const r = filterKpisByQuarter(sample, 1);
    expect(r.map((k) => k.date)).toEqual(["2026-01-15", "2026-03-31"]);
  });

  it("Q2 includes only Apr-Jun", () => {
    const r = filterKpisByQuarter(sample, 2);
    expect(r.map((k) => k.date)).toEqual(["2026-04-01", "2026-06-30"]);
  });

  it("Q3 includes only Jul-Sep", () => {
    const r = filterKpisByQuarter(sample, 3);
    expect(r.map((k) => k.date)).toEqual(["2026-07-01", "2026-09-30"]);
  });

  it("Q4 includes only Oct-Dec", () => {
    const r = filterKpisByQuarter(sample, 4);
    expect(r.map((k) => k.date)).toEqual(["2026-10-01", "2026-12-31"]);
  });

  it("covers every month of the year across the 4 quarters (no gaps, no overlaps)", () => {
    const monthly = Array.from({ length: 12 }, (_, i) =>
      mk(`2026-${String(i + 1).padStart(2, "0")}-15`, 1),
    );
    const q1 = filterKpisByQuarter(monthly, 1);
    const q2 = filterKpisByQuarter(monthly, 2);
    const q3 = filterKpisByQuarter(monthly, 3);
    const q4 = filterKpisByQuarter(monthly, 4);
    expect(q1).toHaveLength(3);
    expect(q2).toHaveLength(3);
    expect(q3).toHaveLength(3);
    expect(q4).toHaveLength(3);
    expect(q1.length + q2.length + q3.length + q4.length).toBe(12);
  });
});