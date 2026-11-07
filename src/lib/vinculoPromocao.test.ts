import { describe, it, expect } from 'vitest';
import { linhasVinculo, roasCampanhasAnuncio, type PromoAtual, type VendasPromocao } from './vinculoPromocao';
const promo: PromoAtual = { promotion_id: 'P1', tipo: 'DEAL', nome: 'Promoção real', nome_tipo: 'Oferta', status: 'started', inicio: null, fim: null };
const vazias: VendasPromocao = { porPromocao: [], semDesconto: { pedidos: 1, unidades: 1, faturamento: 100 }, descontoSemPromocao: { pedidos: 0, unidades: 0, faturamento: 0 }, naoLidos: 0, completo: true };
describe('vínculo promoção e venda', () => {
  it('participação ativa não atribui vendas sem identidade', () => {
    const r = linhasVinculo([promo], { ...vazias, descontoSemPromocao: { pedidos: 2, unidades: 3, faturamento: 120 } })[0];
    expect(r.confirmada).toBe(false); expect(r.grupo).toBeUndefined(); expect(r.zeroConfirmado).toBe(false);
  });
  it('exige identidade e tipo exatos para vincular promoção atual', () => {
    const r = linhasVinculo([promo], { ...vazias, porPromocao: [{ id: 'P1', tipo: 'OTHER', pedidos: 1, unidades: 2, faturamento: 80 }] });
    expect(r).toHaveLength(2); expect(r[0].confirmada).toBe(false); expect(r[1].promo).toBeUndefined();
  });
  it('mostra vendas comprovadas sem multiplicar participação duplicada', () => {
    const r = linhasVinculo([promo, promo], { ...vazias, porPromocao: [{ id: 'P1', tipo: 'DEAL', pedidos: 2, unidades: 4, faturamento: 200 }] });
    expect(r).toHaveLength(1); expect(r[0].grupo?.faturamento).toBe(200); expect(r[0].ativa).toBe(true);
  });
  it('leitura parcial não confirma zero de vendas', () => { expect(linhasVinculo([promo], { ...vazias, completo: false, naoLidos: 3 })[0].zeroConfirmado).toBe(false); });
});
describe('ROAS por campanha do anúncio', () => {
  it('divide somas de receita por custo, nunca média dos ROAS', () => {
    const r = roasCampanhasAnuncio([{ campaign_id: 1, ad_group_id: 4, dia: '2026-11-01', cost: 10, total_amount: 100 }, { campaign_id: 1, ad_group_id: 4, dia: '2026-11-02', cost: 90, total_amount: 180 }], '2026-11-01', '2026-11-02')[0];
    expect(r.roas).toBe(2.8); expect(r.custo).toBe(100); expect(r.receita).toBe(280);
  });
  it('exclui datas fora da janela e valores sem custo alinhado', () => {
    const r = roasCampanhasAnuncio([{ campaign_id: 1, ad_group_id: 4, dia: '2026-10-31', cost: 10, total_amount: 1000 }, { campaign_id: 1, ad_group_id: 4, dia: '2026-11-01', cost: null, total_amount: 100 }], '2026-11-01', '2026-11-02')[0];
    expect(r.roas).toBeNull(); expect(r.receita).toBeNull(); expect(r.dias).toBe(0);
  });
  it('não duplica uma métrica nem calcula retorno com custo zero', () => {
    const row = { campaign_id: 1, ad_group_id: 4, dia: '2026-11-01', cost: 0, total_amount: 100 };
    const r = roasCampanhasAnuncio([row, row], '2026-11-01', '2026-11-02')[0];
    expect(r.receita).toBe(100); expect(r.roas).toBeNull();
  });
});