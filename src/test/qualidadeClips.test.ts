import { describe, it, expect } from 'vitest';
import { evidenciaQualidadeClips, scoreMedido, conversaoClips, qualidadeConfirmavel } from '@/lib/qualidadeClips';
import { rankingClips } from '@/lib/clipsRanking';

describe('evidência de qualidade e Clips', () => {
  it('não declara avaliação quando todas as dimensões estão zeradas na importação legada', () => {
    expect(qualidadeConfirmavel(evidenciaQualidadeClips({ll_pictures_score:0,ll_title_score:0,ll_description_score:0,ll_price_score:0,ll_free_shipping_score:0,ll_promotions_score:0}))).toBe(false);
    expect(qualidadeConfirmavel(evidenciaQualidadeClips({ll_pictures_score:0,ll_title_score:75}))).toBe(true);
  });
  it('preserva ausência sem penalizar qualidade ou inventar faturamento', () => {
    const e = evidenciaQualidadeClips({ ll_pictures_score: null, tgmv_lc_clips: '' });
    expect(e.fotos).toBeNull(); expect(e.faturamento).toBeNull();
  });
  it('preserva zero medido e não converte score 1 em 100', () => {
    expect(scoreMedido(0)).toBe(0); expect(scoreMedido(1)).toBe(1);
  });
  it('calcula pedidos sobre visitas sem usar unidades vendidas', () => {
    const e = evidenciaQualidadeClips({ visitas_clips: 100, orders_clips: 5, si_clips: 12 });
    expect(conversaoClips(e.visitas, e.pedidos)).toBe(5);
  });
  it('não calcula conversão sem denominador ou pedidos medidos', () => {
    expect(conversaoClips(0, 2)).toBeNull(); expect(conversaoClips(100, null)).toBeNull();
  });
  it('ranking preserva última medição pareada sem distribuir totais', () => {
    const r = rankingClips([
      {sellerId:'s', itemId:'a', date:'2026-10-01', visitas:10, pedidos:5},
      {sellerId:'s', itemId:'a', date:'2026-11-01', visitas:100, pedidos:5},
      {sellerId:'s', itemId:'b', date:'2026-11-01', visitas:100, pedidos:null},
    ], 'conversao');
    expect(r).toHaveLength(1); expect(r[0].conversao).toBe(5);
  });
});