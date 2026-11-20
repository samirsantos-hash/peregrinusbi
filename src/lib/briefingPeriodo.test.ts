import { describe, it, expect } from "vitest";
import { briefingPeriodo } from "./briefingPeriodo";

const serie = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
  tgmv: i < 15 ? 100 : 200,
  adsInvestment: 10,
}));

describe("briefingPeriodo", () => {
  it("compara 15 dias com os 15 anteriores", () => {
    const t = briefingPeriodo(serie, "2026-10-16", "2026-10-30")!;
    expect(t).toContain("Nos 15 dias");
    expect(t).toContain("100% acima dos 15 dias anteriores");
  });
  it("sem janela anterior avisa", () => {
    expect(briefingPeriodo(serie, "2026-10-01", "2026-10-15")).toContain("Não há dados dos 15 dias anteriores");
  });
});
