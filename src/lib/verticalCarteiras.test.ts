import { describe, it, expect } from "vitest";
import { compararLojas } from "./verticalCarteiras";

describe("compararLojas", () => {
  const base = [
    { sellerId: "a", vertical: "Moda", atual: 110, anterior: 100 }, // +10%
    { sellerId: "b", vertical: "Moda", atual: 120, anterior: 100 }, // +20% (mediana)
    { sellerId: "c", vertical: "Moda", atual: 130, anterior: 100 }, // +30%
    { sellerId: "d", vertical: "Moda", atual: 50, anterior: 0 }, // sem base
    { sellerId: "e", vertical: null, atual: 10, anterior: 10 },
  ];
  it("compara cada loja com a mediana de crescimento da própria vertical", () => {
    const r = compararLojas(base);
    expect(r.verticais[0].medianaCresc).toBeCloseTo(0.2);
    expect(r.lojas.find((l) => l.sellerId === "c")!.vsMediana).toBeCloseTo(0.1);
    expect(r.lojas.find((l) => l.sellerId === "a")!.vsMediana).toBeCloseTo(-0.1);
  });
  it("loja sem faturamento no mês anterior não tem crescimento e lojas sem vertical ficam de fora", () => {
    const r = compararLojas(base);
    expect(r.lojas.find((l) => l.sellerId === "d")!.crescimento).toBeNull();
    expect(r.lojas.some((l) => l.sellerId === "e")).toBe(false);
    expect(r.verticais[0].acima).toBeCloseTo(1 / 3);
  });
});
