import { describe, it, expect } from 'vitest';
import { janelaAnalise, projetarPedidos } from '../../supabase/functions/_shared/mlAnaliseLoja';
describe('Leitura limpa da loja', () => {
  it('usa 30 dias UTC completos sem hoje', () => {
    expect(janelaAnalise(new Date('2026-10-26T16:28:00Z'))).toEqual({ inicio: '2026-09-26', fim: '2026-10-25' });
  });
  it('separa pedidos pagos, unidades e cancelamentos sem duplicar', () => {
    const pago = { id: 1, date_created: '2026-10-01', status: 'paid', order_items: [{ item: { id: 'MLB1' }, quantity: 3, unit_price: 10 }] };
    const r = projetarPedidos([pago, pago, { id: 2, date_created: '2026-10-01', status: 'cancelled' }, { id: 3, date_created: '2026-10-01', status: 'pending' }], '2026-10-01', '2026-10-02');
    expect(r.pedidos).toBe(1); expect(r.unidades).toBe(3); expect(r.faturamento).toBe(30); expect(r.taxaCancelamento).toBe(.5);
    expect(r.serie[1].faturamento).toBe(0); expect(r.itens[0].diario['2026-10-01']).toBe(30);
  });
});