import { describe, expect, it } from 'vitest';
import { precoPorMargem } from '@/lib/precoPorMargem';
describe('preço pela margem de lucro sobre a venda', () => {
  it('usa margem sobre venda, não markup do custo', () => { expect(precoPorMargem(60, 10, 10, 20)).toBe(100); });
  it('não calcula sem custos ou com taxas e margem inviáveis', () => {
    expect(precoPorMargem(NaN,0,10,20)).toBeNull(); expect(precoPorMargem(60,0,80,20)).toBeNull(); expect(precoPorMargem(0,0,10,20)).toBeNull(); expect(precoPorMargem(60,-1,10,20)).toBeNull();
  });
  it('arredonda para cima ao centavo para preservar a margem', () => { expect(precoPorMargem(10,0,10,20)).toBe(14.29); });
});