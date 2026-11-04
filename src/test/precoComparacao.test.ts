import { describe, expect, it } from 'vitest';
import { coberturaPreco, percentualPreco } from '@/lib/precoComparacao';

describe('comparação de preço', () => {
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