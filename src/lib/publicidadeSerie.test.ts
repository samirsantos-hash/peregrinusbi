import { describe, expect, it } from 'vitest';
import { agruparPublicidade } from './publicidadeSerie';

describe('métricas selecionáveis de publicidade', () => {
  const pontos = [
    { data: '2026-11-09', faturamento: 100, investimento: 10, receitaAds: 50 },
    { data: '2026-11-10', faturamento: 900, investimento: 90, receitaAds: 150 },
  ];
  it('ROAS usa receita atribuída sobre investimento acumulado', () => {
    expect(agruparPublicidade(pontos, true)[0].roas).toBe(2);
  });
  it('ACOS usa investimento sobre receita atribuída acumulada', () => {
    expect(agruparPublicidade(pontos, true)[0].acos).toBe(0.5);
  });
  it('TACOS usa investimento sobre faturamento total nas mesmas datas', () => {
    expect(agruparPublicidade(pontos, true)[0].tacos).toBe(0.1);
  });
  it('ausência de investimento mantém ACOS TACOS e ROAS indisponíveis', () => {
    const [p] = agruparPublicidade([pontos[0], { ...pontos[1], investimento: null }], true);
    expect(p.investimento).toBeNull(); expect(p.roas).toBeNull(); expect(p.acos).toBeNull(); expect(p.tacos).toBeNull();
    expect(p.receitaAds).toBe(200);
  });
  it('não divide por denominador zero', () => {
    const [p] = agruparPublicidade([{ ...pontos[0], faturamento: 0, receitaAds: 0, investimento: 0 }], false);
    expect(p.roas).toBeNull(); expect(p.acos).toBeNull(); expect(p.tacos).toBeNull();
  });
});