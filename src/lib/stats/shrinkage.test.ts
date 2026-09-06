import { describe, it, expect } from "vitest";
import { shrinkEstimate } from "./shrinkage";

const base = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`,
  valor: 6 + i * 0.4,
  n: 12,
  vertical: "AUTO",
}));

describe("shrinkEstimate", () => {
  it("estoura erro quando n está ausente", () => {
    expect(() => shrinkEstimate([...base, { id: "x", valor: 10, n: 0, vertical: "AUTO" }])).toThrow(
      /n ausente para loja x/,
    );
  });

  it("estoura erro sem grupo de referência", () => {
    expect(() => shrinkEstimate([])).toThrow(/prior indefinido/);
  });

  it("B ≈ 0,50 com 1 mês e ≈ 0,12 com 7 meses", () => {
    const r = shrinkEstimate([
      ...base,
      { id: "novo", valor: 202, n: 1, vertical: "AUTO" },
      { id: "maduro", valor: 12, n: 7, vertical: "AUTO" },
    ]);
    const novo = r.find((x) => x.id === "novo")!;
    const maduro = r.find((x) => x.id === "maduro")!;
    expect(novo.B).toBeCloseTo(0.5, 2);
    expect(maduro.B).toBeCloseTo(0.125, 2);
  });

  it("loja de amostra mínima não lidera o ranking ajustado", () => {
    const r = shrinkEstimate([
      ...base,
      { id: "outlier", valor: 202, n: 1, vertical: "AUTO" },
      { id: "solido", valor: 40, n: 12, vertical: "AUTO" },
    ]).sort((a, b) => b.valorAjustado - a.valorAjustado);
    expect(r[0].id).toBe("solido");
  });

  it("cai para o prior da carteira quando a vertical é pequena", () => {
    const r = shrinkEstimate([...base, { id: "raro", valor: 30, n: 3, vertical: "NICHO" }]);
    expect(r.find((x) => x.id === "raro")!.priorEscopo).toBe("carteira");
  });
});
