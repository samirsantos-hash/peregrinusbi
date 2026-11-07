import { describe, it, expect } from "vitest";
import { adicionarDiasIso, diasInclusive, formatarPeriodoBr } from "./periodoResumo";

describe("periodoResumo", () => {
  it("formata período em pt-BR", () => {
    expect(formatarPeriodoBr("2026-09-23", "2026-10-20")).toBe("23/09/2026 a 20/10/2026");
  });

  it("soma dias em calendário local sem drift UTC", () => {
    expect(adicionarDiasIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(adicionarDiasIso("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("conta dias inclusive", () => {
    expect(diasInclusive("2026-10-01", "2026-10-01")).toBe(1);
    expect(diasInclusive("2026-10-01", "2026-10-30")).toBe(30);
  });
});
