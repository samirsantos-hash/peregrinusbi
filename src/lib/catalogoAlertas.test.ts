import { describe, it, expect } from "vitest";
import { resumirCatalogo } from "./catalogoAlertas";
const an = [
  { itemId: "MLB1", status: "active", estoque: 0, preco: 70 },
  { itemId: "MLB2", status: "paused", estoque: 5, preco: 10 },
  { itemId: "MLB3", status: "paused", estoque: 5, preco: 10 },
  { itemId: "MLB4", status: "active", estoque: 3, preco: 99 },
];
describe("resumirCatalogo", () => {
  it("conta estoque zerado e pausados com/sem venda nos 7 dias", () => {
    const r = resumirCatalogo(an, new Map([["1", 7], ["2", 14], ["4", 50]]));
    expect([r.estoqueZerado, r.pausadosComVenda, r.pausadosSemVenda]).toEqual([1, 1, 1]);
  });
  it("perda por dia = vendas 7d × preço ÷ 7, só de zerados e pausados", () => {
    expect(resumirCatalogo(an, new Map([["1", 7], ["2", 14], ["4", 50]])).perdaDia).toBe(90);
  });
  it("sem medição de vendas, perda fica nula", () => {
    expect(resumirCatalogo(an, null).perdaDia).toBeNull();
  });
});
