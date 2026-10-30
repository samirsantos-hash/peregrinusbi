import { describe, expect, it } from "vitest";
import { calcularSinergiaPublicidade, pearsonPareado, type PontoPublicidade } from "@/lib/sinergiaPublicidade";
const pontos = (n = 7): PontoPublicidade[] => Array.from({ length: n }, (_, i) => ({ data: `2026-10-${i + 1}`, investimento: i + 1, faturamento: (i + 1) * 10, receitaAds: (i + 1) * 4 }));
describe("sinergia de publicidade", () => {
  it("matriz exclui pares ausentes sem deslocar as séries", () => {
    expect(pearsonPareado([[1, 2], [2, 4], [null, 99], [3, 6], [4, 8], [5, 10], [6, 12], [7, 14]])).toBeCloseTo(1);
  });
  it("matriz não transforma série constante em zero", () => {
    expect(pearsonPareado(Array.from({ length: 7 }, (_, i) => [0, i]))).toBeNull();
  });
  it("matriz exige sete pares", () => {
    expect(pearsonPareado(Array.from({ length: 6 }, (_, i) => [i, i * 2]))).toBeNull();
  });
  it("calcula dependência atribuída e TACOS pelos totais", () => {
    const r = calcularSinergiaPublicidade([...pontos(), { data: "2026-10-08", investimento: 20, faturamento: 1000, receitaAds: 10 }]);
    expect(r.participacao).toBeCloseTo(122 / 1280); expect(r.tacos).toBeCloseTo(48 / 1280);
  });
  it("calcula Pearson com sete observações alinhadas", () => expect(calcularSinergiaPublicidade(pontos()).correlacao).toBeCloseTo(1));
  it("não calcula sinergia com menos de sete observações", () => expect(calcularSinergiaPublicidade(pontos(6)).correlacao).toBeNull());
  it("série constante não significa correlação zero", () => expect(calcularSinergiaPublicidade(pontos().map(p => ({ ...p, investimento: 1 }))).correlacao).toBeNull());
  it("não converte valores ausentes em zero", () => {
    const r = calcularSinergiaPublicidade(pontos().map((p, i) => i === 0 ? { ...p, investimento: null } : p));
    expect(r.tacos).toBeNull(); expect(r.observacoes).toBe(6); expect(r.correlacao).toBeNull();
  });
  it("não inventa participação ou vendas orgânicas quando atribuição excede faturamento", () => {
    const r = calcularSinergiaPublicidade(pontos().map(p => ({ ...p, receitaAds: 1000 })));
    expect(r.atribuicaoIncompativel).toBe(true); expect(r.participacao).toBeNull();
  });
  it("denominador zero mantém indicador indisponível", () => expect(calcularSinergiaPublicidade([{ data: "2026-10-01", investimento: 0, faturamento: 0, receitaAds: 0 }]).tacos).toBeNull());
});