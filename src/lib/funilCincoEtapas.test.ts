import { describe, it, expect } from "vitest";
import { funilCincoEtapas } from "./funilCincoEtapas";

describe("funilCincoEtapas", () => {
  it("marca ATC e Checkout como estimativa e o resto como real", () => {
    const f = funilCincoEtapas(1000, 40);
    expect(f.etapas.map((e) => e.fonte)).toEqual([
      "real",
      "real",
      "estimativa",
      "estimativa",
      "real",
    ]);
    expect(f.etapas[0].valor).toBe(1000);
    expect(f.etapas[1].valor).toBe(1000);
    expect(f.etapas[4].valor).toBe(40);
  });

  it("mantém ATC e Checkout entre PDP e pedidos", () => {
    const f = funilCincoEtapas(1000, 64);
    const [, pdp, atc, checkout, pedidos] = f.etapas;
    expect(atc.valor).toBeLessThanOrEqual(pdp.valor);
    expect(atc.valor).toBeGreaterThanOrEqual(checkout.valor);
    expect(checkout.valor).toBeGreaterThanOrEqual(pedidos.valor);
  });

  it("calcula CVR e aponta abandono estimado (pula PDP=visitas)", () => {
    const f = funilCincoEtapas(1000, 10);
    expect(f.cvr).toBeCloseTo(0.01);
    expect(f.maiorAbandono).not.toBeNull();
    expect(f.maiorAbandono!.de).not.toBe("Visitas totais");
    expect(f.maiorAbandono!.estimado).toBe(true);
  });

  it("limita pedidos ao topo do funil quando TSI > visitas", () => {
    const f = funilCincoEtapas(100, 250);
    expect(f.etapas[4].valor).toBe(100);
    expect(f.cvr).toBe(1);
  });

  it("sem visitas retorna CVR nulo e sem abandono", () => {
    const f = funilCincoEtapas(0, 0);
    expect(f.cvr).toBeNull();
    expect(f.maiorAbandono).toBeNull();
  });
});
