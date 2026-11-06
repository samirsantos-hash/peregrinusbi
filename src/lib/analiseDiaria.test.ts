import { describe, it, expect } from "vitest";
import { analiseDiaria, faixaInvestimento, investimento30d, metaInvestimentoAds, metaInvestimentoAdsCoberta } from "./analiseDiaria";

describe('meta Ads em datas medidas conjuntamente', () => {
  const serie = [{ data: '2026-11-01', faturamento: 1000 }, { data: '2026-11-02', faturamento: 9000 }, { data: '2026-11-03', faturamento: 1000 }];
  it('usa meta de 3% apenas da receita dos dias com custo, sem atribuir tier ao período parcial', () => {
    const r = metaInvestimentoAdsCoberta([{ dia: '2026-11-01', cost: 20 }, { dia: '2026-11-01', cost: 10 }, { dia: '2026-11-03', cost: 30 }], serie, '2026-11-01', '2026-11-03');
    expect(r).toMatchObject({ investimento: 60, faturamento: 2000, meta: 60, share: 3, atingimento: 100, dias: 2, totalDias: 3, parcial: true, faixa: null });
  });
  it('custo nulo em uma campanha exclui toda essa data', () => {
    const r = metaInvestimentoAdsCoberta([{ dia: '2026-11-01', cost: 10 }, { dia: '2026-11-01', cost: null }, { dia: '2026-11-03', cost: 15 }], serie, '2026-11-01', '2026-11-03');
    expect(r).toMatchObject({ investimento: 15, faturamento: 1000, dias: 1, inicio: '2026-11-03', share: 1.5 });
  });
  it('ausência de receita coincidente não usa o total de outras datas', () => {
    expect(metaInvestimentoAdsCoberta([{ dia: '2026-11-02', cost: 10 }], [serie[0]], '2026-11-01', '2026-11-03')).toBeNull();
  });
  it('zero observado é válido e cobertura completa conserva os requisitos financeiros', () => {
    const r = metaInvestimentoAdsCoberta([{ dia: '2026-11-01', cost: 0 }], [serie[0]], '2026-11-01', '2026-11-01');
    expect(r).toMatchObject({ investimento: 0, share: 0, atingimento: 0, dias: 1, parcial: false, faixa: { alerta: true } });
  });
});

describe("melhorias aprovadas CND27", () => {
  it('meta interna é 3% do faturamento, ponderada pelo total', () => {
    const r = metaInvestimentoAds([{ dia: '2026-10-01', cost: 10 }, { dia: '2026-10-02', cost: 50 }], '2026-10-01', '2026-10-02', 2000);
    expect(r?.meta).toBe(60);
    expect(r?.share).toBe(3);
    expect(r?.atingimento).toBe(100);
    expect(r?.falta).toBe(0);
  });
  it('distância monetária à meta não confunde Tier 1 com meta interna', () => {
    const r = metaInvestimentoAds([{ dia: '2026-10-01', cost: 25 }], '2026-10-01', '2026-10-01', 1000);
    expect(r?.faixa?.tier).toBe(1);
    expect(r?.faixa?.metaPeregrinus).toBe(false);
    expect(r?.falta).toBe(5);
  });
  it('cobertura ausente, custo nulo ou faturamento zero não viram investimento zero', () => {
    expect(metaInvestimentoAds([{ dia: '2026-10-01', cost: 0 }], '2026-10-01', '2026-10-02', 1000)).toBeNull();
    expect(metaInvestimentoAds([{ dia: '2026-10-01', cost: null }], '2026-10-01', '2026-10-01', 1000)).toBeNull();
    expect(metaInvestimentoAds([{ dia: '2026-10-01', cost: 0 }], '2026-10-01', '2026-10-01', 0)).toBeNull();
    expect(metaInvestimentoAds([{ dia: '2026-10-01', cost: 0 }], '2026-10-01', '2026-10-01', 1000)?.share).toBe(0);
  });
  it("média inclui dias sem venda, mediana e recorde usam a série diária", () => {
    const a = analiseDiaria([
      { date: "2026-10-06", revenue: 0 }, { date: "2026-10-07", revenue: 5904.72 },
      { date: "2026-10-08", revenue: 100 },
    ]);
    expect(a?.media).toBeCloseTo(6004.72 / 3);
    expect(a?.mediana).toBe(100);
    expect(a?.recorde?.date).toBe("2026-10-07");
    expect(a?.recorde?.revenue).toBe(5904.72);
  });
  it("lacunas não viram zero no gráfico e o período tem denominador calendário", () => {
    const a = analiseDiaria([{ date: "2026-10-01", revenue: 30 }, { date: "2026-10-03", revenue: 0 }]);
    expect(a?.serie[1].revenue).toBeNull();
    expect(a?.serie[2].revenue).toBe(0);
    expect(a?.media).toBe(10);
    expect(a?.diasComDado).toBe(2);
  });
  it("normaliza por ocorrência e exige quatro de cada dia para leitura", () => {
    const rows = Array.from({ length: 28 }, (_, i) => ({ date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), revenue: 100, visits: 100, tsi: 5 }));
    expect(analiseDiaria(rows.slice(0, 27))?.leituraSemanal).toBe(false);
    const a = analiseDiaria(rows);
    expect(a?.leituraSemanal).toBe(true);
    expect(a?.semana.every((s) => s.ocorrencias === 4 && s.visitasMedia === 100 && s.conversao === 5)).toBe(true);
  });
  it.each([[0.49, null], [0.5, 3], [1.24, 3], [1.25, 2], [2.49, 2], [2.5, 1], [3, 1]])("investimento %s%% atende só requisito financeiro tier %s", (share, tier) => {
    expect(faixaInvestimento(share)?.tier).toBe(tier);
    expect(faixaInvestimento(share)?.alerta).toBe(share < 0.5);
    expect(faixaInvestimento(share)?.metaPeregrinus).toBe(share >= 3);
  });
  it("distância ao Tier 2 é 0,73 p.p. em 0,52%", () => {
    expect(faixaInvestimento(0.52)?.distancia).toBeCloseTo(0.73);
  });
  it("investimento ponderado usa 30 dias inclusivos, sem mensal nem dia anterior", () => {
    const r = investimento30d([{ date: "2026-09-18", revenue: 1000, adsInvestment: 1000 }, { date: "2026-09-19", revenue: 1000, adsInvestment: 30 }, { date: "2026-10-18", revenue: 2000, adsInvestment: 60 }]);
    expect(r?.share).toBe(3); expect(r?.from).toBe("2026-09-19"); expect(r?.faturamento).toBe(3000);
  });
});