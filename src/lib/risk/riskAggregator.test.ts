import { describe, it, expect } from "vitest";
import { aggregateRisk, type RiskSellerInput } from "./riskAggregator";
import type { BpcThresholdModel } from "./bpcThresholds";
import type { ChurnStat } from "./churnRisk";

const bpcModel: BpcThresholdModel = {
  perVertical: {
    AUTO: { vertical: "AUTO", n: 100, mean: 0.77, sd: 0.18, threshold: 0.55, source: "vertical" },
  },
  global: { n: 500, mean: 0.77, sd: 0.18, threshold: 0.55 },
};

const churnStats: Record<string, ChurnStat> = {
  AUTO: { vertical: "AUTO", n: 100, meanDelta: 0, sdDelta: 0.2, medianDelta: 0, madDelta: 0.05 },
  __GLOBAL__: { vertical: "__GLOBAL__", n: 500, meanDelta: 0, sdDelta: 0.2, medianDelta: 0, madDelta: 0.05 },
};

function make(overrides: Partial<RiskSellerInput> = {}): RiskSellerInput {
  return {
    sellerId: "s1",
    custId: "1",
    nickname: "S1",
    vertical: "AUTO",
    bpc: 0.9,
    repClaimsRate: 0,
    repDelayedRate: 0,
    gmvClosed: 10000,
    triplet: { sellerId: "s1", current: 5000, closed: 10000, prior: 10000 },
    ...overrides,
  };
}

describe("aggregateRisk", () => {
  it("ignora sellers sem sinais", () => {
    expect(aggregateRisk([make()], bpcModel, churnStats)).toHaveLength(0);
  });

  it("classifica alta com 1 sinal alto (BPC baixo)", () => {
    const r = aggregateRisk([make({ bpc: 0.4 })], bpcModel, churnStats);
    expect(r[0].severity).toBe("alta");
    expect(r[0].signals.map((s) => s.kind)).toContain("bpc");
  });

  it("classifica média com 1 sinal médio (reputação alerta)", () => {
    const r = aggregateRisk([make({ repClaimsRate: 0.03 })], bpcModel, churnStats);
    expect(r[0].severity).toBe("media");
  });

  it("classifica alta com 2 sinais médios", () => {
    const r = aggregateRisk(
      [make({ repClaimsRate: 0.03, repDelayedRate: 0.03 })],
      bpcModel,
      churnStats,
    );
    expect(r[0].severity).toBe("alta");
  });

  it("churn absoluto = alta severidade", () => {
    const r = aggregateRisk(
      [make({ triplet: { sellerId: "s1", current: 0, closed: 10000, prior: 8000 } })],
      bpcModel,
      churnStats,
    );
    expect(r[0].severity).toBe("alta");
    expect(r[0].signals.some((s) => s.kind === "churn_absoluto")).toBe(true);
  });

  it("z robusto <= -3.5 = alta (queda anômala)", () => {
    const r = aggregateRisk(
      [make({ triplet: { sellerId: "s1", current: 1000, closed: 2000, prior: 10000 } })],
      bpcModel,
      churnStats,
    );
    expect(r[0].severity).toBe("alta");
    expect(r[0].signals.some((s) => s.kind === "churn_relativo" && s.severity === "alta")).toBe(true);
  });

  it("z robusto entre -3.0 e -3.5 = media", () => {
    const r = aggregateRisk(
      [make({ triplet: { sellerId: "s1", current: 7630, closed: 7630, prior: 10000 } })],
      bpcModel,
      churnStats,
    );
    expect(r[0].severity).toBe("media");
  });

  it("ordena por severidade e nº de sinais", () => {
    const r = aggregateRisk(
      [
        make({ sellerId: "s_med", repClaimsRate: 0.03 }),
        make({ sellerId: "s_alta", bpc: 0.4 }),
      ],
      bpcModel,
      churnStats,
    );
    expect(r[0].sellerId).toBe("s_alta");
    expect(r[1].sellerId).toBe("s_med");
  });
});