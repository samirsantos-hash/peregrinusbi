import { describe, it, expect } from "vitest";
import { safeShare, safePct, shareVisitasCaras, normalizeRateToPct } from "./percentGuards";

describe("safeShare", () => {
  it("calcula a razão normal", () => {
    expect(safeShare(30, 100)).toBeCloseTo(0.3);
  });

  it("retorna null sem base válida", () => {
    expect(safeShare(10, 0)).toBeNull();
    expect(safeShare(10, null)).toBeNull();
    expect(safeShare(10, undefined)).toBeNull();
    expect(safeShare(10, -5)).toBeNull();
    expect(safeShare(10, NaN)).toBeNull();
  });

  it("nunca ultrapassa 100% mesmo com numerador absurdo", () => {
    expect(safeShare(752, 407)).toBe(1);
    expect(safeShare(1_226_891_999, 124_628_273)).toBe(1);
  });

  it("nunca fica negativo", () => {
    expect(safeShare(-50, 100)).toBe(0);
  });

  it("respeita teto customizado", () => {
    expect(safeShare(300, 100, { cap: 2 })).toBe(2);
  });
});

describe("safePct", () => {
  it("converte para pontos percentuais uma única vez", () => {
    expect(safePct(30, 100)).toBeCloseTo(30);
  });

  it("regressão: não produz milhares por cento", () => {
    const pct = safePct(5694.9, 100);
    expect(pct).not.toBeNull();
    expect(pct as number).toBeLessThanOrEqual(100);
  });

  it("propaga null sem base", () => {
    expect(safePct(5, 0)).toBeNull();
  });
});

describe("shareVisitasCaras", () => {
  it("soma ponderada pelas visitas", () => {
    const s = shareVisitasCaras([
      { visits: 100, visitsExpensive: 50 },
      { visits: 100, visitsExpensive: 10 },
    ]);
    expect(s).toBeCloseTo(0.3);
  });

  it("limita linha a linha quando visits_expensive > visits", () => {
    const s = shareVisitasCaras([
      { visits: 407, visitsExpensive: 752 },
      { visits: 1000, visitsExpensive: 0 },
    ]);
    expect(s).toBeCloseTo(407 / 1407);
  });

  it("regressão 5.694,9%: resultado permanece <= 1", () => {
    const linhas = Array.from({ length: 30 }, () => ({ visits: 10, visitsExpensive: 5000 }));
    expect(shareVisitasCaras(linhas)).toBe(1);
  });

  it("ignora dias sem visitas e valores inválidos", () => {
    const s = shareVisitasCaras([
      { visits: 0, visitsExpensive: 900 },
      { visits: 200, visitsExpensive: 100 },
      { visits: null, visitsExpensive: null },
      { visits: 200, visitsExpensive: -30 },
    ]);
    expect(s).toBeCloseTo(100 / 400);
  });

  it("retorna null sem nenhuma linha com base", () => {
    expect(shareVisitasCaras([])).toBeNull();
    expect(shareVisitasCaras([{ visits: 0, visitsExpensive: 10 }])).toBeNull();
  });
});

describe("normalizeRateToPct", () => {
  it("converte escala 0–1 multiplicando por 100 uma vez", () => {
    expect(normalizeRateToPct(0.0285)).toBeCloseTo(2.85);
  });

  it("não multiplica de novo quando já está em 0–100", () => {
    expect(normalizeRateToPct(2.85)).toBeCloseTo(2.85);
    expect(normalizeRateToPct(97.2)).toBeCloseTo(97.2);
  });

  it("trata limites e valores inválidos", () => {
    expect(normalizeRateToPct(1)).toBe(100);
    expect(normalizeRateToPct(0)).toBe(0);
    expect(normalizeRateToPct(1234)).toBe(100);
    expect(normalizeRateToPct(null)).toBeNull();
    expect(normalizeRateToPct(NaN)).toBeNull();
  });
});
