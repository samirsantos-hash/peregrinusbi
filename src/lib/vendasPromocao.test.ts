import { describe, expect, it } from 'vitest';
import { agruparVendasPromocao } from '../../supabase/functions/_shared/mlVendasPromocao';
const d = (offer: string) => ({ details: [{ type: 'discount', items: [{ id: 'MLB1' }], supplier: { offer_id: offer } }] });
describe('agruparVendasPromocao', () => {
  it('soma pedidos pela oferta do desconto', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 2, faturamento: 100, desconto: d('A') }, { id: '2', unidades: 1, faturamento: 50, desconto: d('A') }]);
    expect(r.porPromocao).toEqual([{ id: 'A', tipo: 'discount', pedidos: 2, unidades: 3, faturamento: 150 }]);
  });
  it('pedido sem leitura de desconto não vira zero nem "sem desconto"', () => {
    const r = agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 10, desconto: undefined }]);
    expect(r.naoLidos).toBe(1); expect(r.semDesconto.pedidos).toBe(0);
  });
  it('desconto lido sem detalhes conta como sem desconto', () => {
    expect(agruparVendasPromocao('MLB1', [{ id: '1', unidades: 1, faturamento: 10, desconto: { details: [] } }]).semDesconto.pedidos).toBe(1);
  });
});
