import { describe, expect, it } from 'vitest';
import { percentualPreco } from '@/lib/precoComparacao';

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
});