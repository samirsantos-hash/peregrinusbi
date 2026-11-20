import { describe, it, expect } from "vitest";
import { taxaReclamacoesPct, mediaMedida, medido } from "@/lib/queries/qualityIndex";
import { pearsonValido } from "@/lib/correlacao";
import { totaisResumo, anteriorComparavel, variacaoPct } from "@/lib/resumoExecutivo";
import { agregarPublicidade } from "@/lib/queries/publicidade";
import { faturamentoAlinhado } from "@/lib/adsAnalise";
import { evaluateChurn } from "@/lib/risk/churnRisk";
import { compararLojas } from "@/lib/verticalCarteiras";
import { trocouIdentidade, eCancelamento } from "@/lib/cachePainel";
import { cenarioMigracaoFull } from "@/components/dashboard/LogisticsPanel";
import { taxaCancelamentoPedidos } from "@/pages/Multilojas";
import { alavancas, vazio } from "@/lib/carteiraDeepDive/calculo";

describe("auditoria 06/11 — casos numéricos", () => {
  it("01 troca de identidade limpa a memória", () => {
    expect(trocouIdentidade(undefined, "a")).toBe(false);
    expect(trocouIdentidade("a", "b")).toBe(true);
    expect(trocouIdentidade("a", null)).toBe(true);
    expect(trocouIdentidade("a", "a")).toBe(false);
  });
  it("02 AbortError é cancelamento esperado", () => {
    expect(eCancelamento({ name: "AbortError" })).toBe(true);
    expect(eCancelamento(new Error("falha real"))).toBe(false);
  });
  it("03 taxa de reclamações 0,06 = 6%", () => {
    expect(taxaReclamacoesPct(0.06)).toBeCloseTo(6);
    expect(taxaReclamacoesPct(null)).toBeNull();
  });
  it("04 desconhecido não entra na nota", () => {
    expect(medido("")).toBeNull();
    expect(mediaMedida([{ score: 80, peso: 0.5 }, { score: null, peso: 0.5 }])).toBe(80);
    expect(mediaMedida([{ score: null, peso: 1 }])).toBeNull();
  });
  it("06 zeros medidos entram na média: [100,0,0,0] = 25", () => {
    expect(mediaMedida([100, 0, 0, 0].map((score) => ({ score, peso: 1 })))).toBe(25);
  });
  it("09 período anterior com 10 de 30 dias não é base", () => {
    expect(anteriorComparavel(30, 10)).toBe(false);
    expect(anteriorComparavel(30, 30)).toBe(true);
    expect(variacaoPct(3000, null)).toBeNull();
  });
  it("10 receita por visita só nas datas com visitas medidas", () => {
    const t = totaisResumo([
      { date: "2026-10-01", tgmv: 1000, visits: 100 },
      { date: "2026-10-02", tgmv: 1000, visits: 0, visitsMedidas: false },
    ]);
    expect(t.receitaVisita).toBe(10);
    expect(t.diasComVisita).toBe(1);
  });
  it("11 receita Ads desconhecida não vira ROAS 0", () => {
    const a = agregarPublicidade([{ inv_pads: 100, tgmv_lc_pads: null, tgmv_lc: 1000 }]);
    expect(a.roas).toBeNull();
    expect(a.acos).toBeNull();
  });
  it("12 TACOS só com faturamento das mesmas datas", () => {
    const serie = [{ dia: "2026-11-01", cost: 300, total_amount: 0, clicks: 0, prints: 0, units_quantity: 0, campaign_id: 1 }] as any;
    expect(faturamentoAlinhado([{ data: "2026-11-01", faturamento: 10000 }], serie, "2026-11-01", 1)).toBe(10000);
    expect(faturamentoAlinhado([{ data: "2026-10-01", faturamento: 20000 }], serie, "2026-11-01", 1)).toBeNull();
  });
  it("16 Pearson exige 7 pares com variação", () => {
    expect(pearsonValido([1, 2, 3], [1, 2, 3])).toBeNull();
    expect(pearsonValido([1, 1, 1, 1, 1, 1, 1], [1, 2, 3, 4, 5, 6, 7])).toBeNull();
    expect(pearsonValido([1, 2, 3, 4, 5, 6, 7], [2, 4, 6, 8, 10, 12, 14])).toBeCloseTo(1);
  });
  it("24 migrar 10 p.p. de R$1.000 com residual R$500 move R$100", () => {
    expect(cenarioMigracaoFull(1000, 500, 10)).toBe(100);
    expect(cenarioMigracaoFull(1000, 50, 10)).toBe(50);
  });
  it("27 proporção sem cobertura completa fica indisponível", () => {
    const t = { ...vazio(), linhas: 2, gmv: 100, full: 50, mGmv: 2, mFull: 1 };
    expect(alavancas(t).full).toBeNull();
  });
  it("28 mês atual ausente não vira queda de 100%", () => {
    const r = compararLojas([{ sellerId: "a", vertical: "Moda", atual: null, anterior: 100 }]);
    expect(r.lojas[0].crescimento).toBeNull();
  });
  it("31 mês corrente sem registro não é churn absoluto", () => {
    expect(evaluateChurn({ sellerId: "s", current: null, closed: 1000, prior: 1000 }, null, {}).some((x) => x.type === "absolute")).toBe(false);
    expect(evaluateChurn({ sellerId: "s", current: 0, closed: 1000, prior: 1000 }, null, {}).some((x) => x.type === "absolute")).toBe(true);
  });
  it("33 um pago e um cancelado com duas linhas = 50%", () => {
    expect(taxaCancelamentoPedidos([{ id: 1 }], [{ id: 2 }, { id: 2 }])).toBe(0.5);
    expect(taxaCancelamentoPedidos([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 2 }])).toBe(0.5);
  });
});
