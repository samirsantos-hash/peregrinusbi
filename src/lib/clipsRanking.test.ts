import { describe, expect, it } from 'vitest';
import { rankingClips } from './clipsRanking';
const a = { sellerId: 'loja', itemId: 'MLB1', date: '2026-10-27', visitas: 100, pedidos: 10 };
describe('ranking de Clips por anúncio', () => {
  it('calcula pedidos por visitas e ordena por conversão ou visitas', () => {
    const itens = [a, { ...a, itemId: 'MLB2', visitas: 1000, pedidos: 20 }];
    expect(rankingClips(itens, 'conversao')[0].conversao).toBe(10);
    expect(rankingClips(itens, 'visitas')[0].itemId).toBe('MLB2');
  });
  it('mantém medidas do mesmo registro mais recente sem somar snapshots', () => {
    expect(rankingClips([{ ...a, date: '2026-10-26', visitas: 5000, pedidos: 1000 }, a], 'conversao')[0].conversao).toBe(10);
  });
  it('ausência de pedidos não vira conversão zero; visitas zero não têm conversão', () => {
    expect(rankingClips([{ ...a, pedidos: null }, { ...a, itemId: 'MLB2', visitas: 0 }], 'conversao')).toEqual([]);
    expect(rankingClips([{ ...a, pedidos: null }], 'visitas')[0].conversao).toBeNull();
    expect(rankingClips([{ ...a, pedidos: 0 }], 'conversao')[0].conversao).toBe(0);
  });
});