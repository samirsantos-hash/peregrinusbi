import { describe, it, expect } from "vitest";
import { calcularFavorabilidade, calcularTaxaVenda } from "./pockIndicadores";

describe("favorabilidade", () => {
  it("todas as metas cumpridas e Platinum = 100%", () => {
    expect(calcularFavorabilidade({ bpc: 0.7, repLevel: "green_platinum", ads: 0.05, full: 0.4, promo: 0.2 }).valor).toBe(100);
  });
  it("Full em 20% vale metade da meta de 40%", () => {
    const r = calcularFavorabilidade({ bpc: null, repLevel: null, ads: null, full: 0.2, promo: 0.2 });
    expect(r.valor).toBe(75);
  });
  it("menos de dois critérios com dado fica sem valor", () => {
    expect(calcularFavorabilidade({ bpc: 0.5, repLevel: null, ads: null, full: null, promo: null }).valor).toBeNull();
  });
});

describe("taxa de venda", () => {
  it("vendedor +10% contra mercado com mediana +4% = +6 p.p.", () => {
    expect(calcularTaxaVenda(10, [2, 4, 8]).valor).toBe(6);
  });
});
