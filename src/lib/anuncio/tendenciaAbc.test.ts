import { describe, expect, it } from 'vitest';
import { tendenciaVendas } from './tendenciaAbc';
describe('tendenciaVendas', () => {
  it('sobe com +10% ou mais', () => expect(tendenciaVendas(110, 100)?.tendencia).toBe('subindo'));
  it('estável entre -10% e +10%', () => expect(tendenciaVendas(95, 100)?.tendencia).toBe('estavel'));
  it('cai entre -10% e -70%', () => expect(tendenciaVendas(50, 100)?.tendencia).toBe('caindo'));
  it('parando com queda de 70% ou mais', () => expect(tendenciaVendas(30, 100)?.tendencia).toBe('parando'));
  it('sem período anterior medido não há tendência', () => expect(tendenciaVendas(10, null)).toBeNull());
  it('sem vendas antes é novo, sem percentual', () => expect(tendenciaVendas(5, 0)).toEqual({ tendencia: 'novo', variacao: null }));
});
