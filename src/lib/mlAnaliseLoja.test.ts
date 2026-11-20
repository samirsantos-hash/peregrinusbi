import { describe, it, expect } from 'vitest';
import { anexarVisitas, janelaAnalise, projetarPedidos } from '../../supabase/functions/_shared/mlAnaliseLoja';
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
  it('grava visitas em cada dia e não transforma ausência em zero', () => {
    const serie = [{ data: '2026-10-01' }, { data: '2026-10-02' }, { data: '2026-10-03' }];
    const cheio = anexarVisitas(serie, [
      { date: '2026-10-01T00:00:00Z', total: 10 },
      { date: '2026-10-02', total: 0 },
      { date: '2026-10-03T03:00:00.000Z', total: 4 },
    ]);
    expect(cheio.serie.map(d => d.visitas)).toEqual([10, 0, 4]);
    expect(cheio.visitas).toBe(14);
    const falta = anexarVisitas(serie, [{ date: '2026-10-01', total: 10 }]);
    expect(falta.serie.map(d => d.visitas)).toEqual([10, null, null]);
    expect(falta.visitas).toBeNull();
  });
});