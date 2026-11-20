import { describe, expect, it } from 'vitest';
import { agruparVendasPromocao } from '../../supabase/functions/_shared/mlVendasPromocao';
const d = (offer: string) => ({ details: [{ type: 'discount', items: [{ id: 'MLB1' }], promotion_id: offer, promotion_type: 'DEAL' }] });
describe('agruparVendasPromocao', () => {
  it('soma pedidos pela oferta do desconto', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 2, faturamento: 100, desconto: d('A') }, { id: '2', unidades: 1, faturamento: 50, desconto: d('A') }]);
    expect(r.porPromocao).toEqual([{ id: 'A', tipo: 'DEAL', pedidos: 2, unidades: 3, faturamento: 150 }]);
  });
  it('pedido sem leitura de desconto não vira zero nem "sem desconto"', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 10, desconto: undefined }]);
    expect(r.naoLidos).toBe(1); expect(r.semDesconto.pedidos).toBe(0);
  });
  it('desconto lido sem detalhes conta como sem desconto', () => {
    expect(agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 10, desconto: { details: [] } }]).semDesconto.pedidos).toBe(1);
  });
});

describe('atribuição sem duplicação', () => {
  it('conta desconto, cupom e cashback apenas uma vez sem presumir campanha', () => {
    const desconto = { details: ['discount','coupon','cashback'].map(type => ({ type, items: [{ id: 'MLB1' }], supplier: { offer_id: 'OFFER-1', campaign_id: '123' } })) };
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 2, faturamento: 100, desconto }]);
    expect(r.porPromocao).toEqual([]);
    expect(r.descontoSemPromocao).toEqual({ pedidos: 1, unidades: 2, faturamento: 100 });
  });
  it('não rateia vendas com mais de uma promoção explícita', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 50, desconto: { details: [...d('A').details, ...d('B').details] } }]);
    expect(r.porPromocao).toEqual([]); expect(r.descontoSemPromocao.faturamento).toBe(50);
  });
  it('deduplica pedidos', () => {
    const p = { id: '1', unidades: 1, faturamento: 50, desconto: d('A') };
    expect(agruparVendasPromocao('MLB1', [p,p]).porPromocao[0].pedidos).toBe(1);
  });
  it('resposta inválida não comprova ausência de desconto', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 50, desconto: {} }]);
    expect(r.naoLidos).toBe(1); expect(r.semDesconto.pedidos).toBe(0);
  });
  it('desconto sem item explícito fica sem vínculo', () => {
    expect(agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 50, desconto: { details: [{ promotion_id: 'A', promotion_type: 'DEAL' }] } }]).descontoSemPromocao.pedidos).toBe(1);
  });
});
