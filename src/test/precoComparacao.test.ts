import { describe, expect, it } from 'vitest';
import { calcularBpc, coberturaPreco, percentualPreco } from '@/lib/precoComparacao';

describe('comparação de preço', () => {
  it('calcula o índice com as faixas reais de novembro da AUTOPECASLONDRINA', () => {
    expect(calcularBpc(9253.2, 19998, 6618)).toBeCloseTo(0.815496303, 8);
  });
  it('não inventa índice quando todas as faixas estão ausentes', () => {
    expect(calcularBpc(0, 0, 0)).toBeNull();
  });
  it('mantém índice zero medido quando toda a base está mais cara', () => {
    expect(calcularBpc(0, 0, 100)).toBe(0);
  });
  it('não produz percentuais sem comparação', () => {
    expect(percentualPreco(0, 0)).toBeNull();
  });
  it('preserva zero real quando existem comparações', () => {
    expect(percentualPreco(0, 100)).toBe(0);
  });
  it('calcula a composição sobre o total de comparações', () => {
    expect(percentualPreco(25, 100)).toBe(25);
  });
  it('não divide as faixas BPC pelas visitas da loja', () => {
    expect(percentualPreco(500, 500 + 500)).toBe(50);
  });
  it('não considera índice isolado como evidência de comparação', () => {
    expect(coberturaPreco([
      { visitsMatch: 1, visitsCheaper: 0, visitsExpensive: 1 },
      { visitsMatch: 0, visitsCheaper: 0, visitsExpensive: 0 },
    ])).toEqual({ comComparacao: 1, total: 2, percentual: 50 });
  });
  it('mantém cobertura ausente quando não existem registros', () => {
    expect(coberturaPreco([])).toEqual({ comComparacao: 0, total: 0, percentual: null });
  });
});