import { describe, expect, it } from 'vitest';
import { gerarInsights, percentualForaCDP, type DadosMes } from '@/lib/queries/insightsPrecificacao';

const anterior: DadosMes = { mes: '2026-09-01', pctMaisBarato: 20, pctEquivalente: 60, pctMaisCaro: 20, totalBPC: 1000 };
const atual: DadosMes = { ...anterior, mes: '2026-10-01' };
describe('evidência de planilha nos diagnósticos de preço', () => {
  it('não gera diagnóstico sem comparação no mês atual', () => {
    const semDados = { ...atual, totalBPC: 0 };
    expect(gerarInsights([anterior, semDados], semDados, null, false, null, false)).toEqual([]);
  });
  it('não inventa adesão à CDP quando ausente', () => {
    expect(percentualForaCDP(null)).toBeNull();
    expect(percentualForaCDP(undefined)).toBeNull();
  });
  it('preserva adesão zero medida na planilha', () => {
    expect(percentualForaCDP(0)).toBe(100);
  });
});