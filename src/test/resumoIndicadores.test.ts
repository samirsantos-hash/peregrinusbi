import { describe, it, expect } from 'vitest';
import { variacaoIndicador } from '@/lib/resumoIndicadores';
import { projetarPedidos } from '../../supabase/functions/_shared/mlAnaliseLoja';
describe('Resumo dos totais do período', () => {
  it('preserva queda de 0,4% no faturamento', () => expect(variacaoIndicador(996, 1000)).toBeCloseTo(-0.4));
  it('preserva queda de 3,5% nos pedidos pagos', () => expect(variacaoIndicador(965, 1000)).toBeCloseTo(-3.5));
  it('não inventa variação sem base', () => { expect(variacaoIndicador(20, 0)).toBeNull(); expect(variacaoIndicador(null, 20)).toBeNull(); });
  it('separa pedidos pagos e cancelados reais na data de criação', () => {
    const r = projetarPedidos([{ id: 1, status: 'paid', date_created: '2026-11-01T12:00:00Z', order_items: [{ item: { id: 'MLB1' }, quantity: 2, unit_price: 30 }] }, { id: 2, status: 'cancelled', date_created: '2026-11-01T13:00:00Z' }], '2026-11-01', '2026-11-02');
    expect(r.serie[0]).toMatchObject({ faturamento: 60, pedidos: 1, cancelados: 1 });
    expect(r.serie[1]).toMatchObject({ faturamento: 0, pedidos: 0, cancelados: 0 });
  });
});