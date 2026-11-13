import { describe, expect, it } from "vitest";
import { compararSwot, valorSwot } from "./swot";
import type { AnuncioComparavel } from "../mlComparacaoAnuncios";
const item = (id: string, extra: Partial<AnuncioComparavel> = {}): AnuncioComparavel => ({ id, titulo: id, tipo: null, preco: 10, link: "", visitas: 100, cliques: null, pedidos: 10, unidades: 10, faturamento: 500, cancelados: 0, conversao: .1, promocao: null, completo: true, ...extra });
describe("Comparação SWOT observada", () => {
  it("compara com a mediana dos outros anúncios, sem incluir o próprio", () => {
    const a = item("A", { visitas: 300 });
    const r = compararSwot(a, [a, item("B", { visitas: 100 }), item("C", { visitas: 200 })]);
    expect(r.forcas.find(x => x.metrica === "visitas")).toEqual({ metrica: "visitas", valor: 300, referencia: 150, delta: 150 });
  });
  it("não transforma ausência ou leitura parcial em fraqueza", () => {
    const a = item("A", { completo: false, visitas: null });
    expect(compararSwot(a, [a, item("B")]).evidencias).toEqual([]);
    expect(compararSwot(a, [a, item("B")]).cancelados).toBeNull();
  });
  it("receita por visita exige denominador positivo e receita confirmada", () => {
    expect(valorSwot(item("A"), "receitaVisita")).toBe(5);
    expect(valorSwot(item("A", { visitas: 0 }), "receitaVisita")).toBeNull();
    expect(valorSwot(item("A", { faturamento: null }), "receitaVisita")).toBeNull();
  });
  it("preserva zero confirmado e empates, sem inventar força ou fraqueza", () => {
    const a = item("A", { visitas: 0 });
    expect(valorSwot(a, "visitas")).toBe(0);
    const r = compararSwot(a, [a, item("B", { visitas: 0 })]);
    expect(r.forcas).toEqual([]); expect(r.fraquezas).toEqual([]);
  });
  it("não classifica anúncio sozinho nem atribui vendas a promoção atual", () => {
    const a = item("A", { promocao: true });
    expect(compararSwot(a, [a]).evidencias).toEqual([]);
  });
  it("sugere revisar alcance apenas com menor visita e maior conversão observadas", () => {
    const a = item("A", { visitas: 50, conversao: .2 });
    expect(compararSwot(a, [a, item("B")]).revisarAlcance).toBe(true);
    expect(compararSwot(item("A"), [item("A"), item("B")]).revisarAlcance).toBe(false);
  });
});