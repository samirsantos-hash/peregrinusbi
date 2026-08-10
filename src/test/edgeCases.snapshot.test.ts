import { describe, it, expect } from "vitest";
import { safeShare, safePct, shareVisitasCaras, normalizeRateToPct } from "@/lib/percentGuards";
import { RAZOES_EXTREMAS, SERIES_VISITAS, TAXAS_BRUTAS } from "./fixtures/edgeCases";

describe("snapshots de casos extremos — guardas percentuais", () => {
  it("razões protegidas", () => {
    const saida = RAZOES_EXTREMAS.map((f) => ({
      caso: f.nome,
      share: safeShare(f.numerador, f.denominador),
      pct: safePct(f.numerador, f.denominador),
    }));
    expect(saida).toMatchSnapshot();
  });

  it("share de visitas caras por série diária", () => {
    const saida = SERIES_VISITAS.map((f) => ({
      caso: f.nome,
      share: shareVisitasCaras(f.linhas),
    }));
    expect(saida).toMatchSnapshot();
  });

  it("normalização de taxas REP_*_RATE", () => {
    const saida = TAXAS_BRUTAS.map((f) => ({
      caso: f.nome,
      pct: normalizeRateToPct(f.valor),
    }));
    expect(saida).toMatchSnapshot();
  });

  it("nenhum caso produz valor fora de 0–100%", () => {
    const valores = [
      ...RAZOES_EXTREMAS.map((f) => safePct(f.numerador, f.denominador)),
      ...SERIES_VISITAS.map((f) => {
        const s = shareVisitasCaras(f.linhas);
        return s == null ? null : s * 100;
      }),
      ...TAXAS_BRUTAS.map((f) => normalizeRateToPct(f.valor)),
    ];
    for (const v of valores) {
      if (v == null) continue;
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});