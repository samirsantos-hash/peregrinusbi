import { describe, it, expect } from 'vitest';
import { anunciosExperienciaA, notaExperienciaLida } from './experiencia';
import { experienciaPedidos } from '../../../supabase/functions/ml-analise-loja/experienciaPedidos';
import { notarExperiencia } from './dimensoes';
const order = (id: number, status: string, ids = ['MLB1']) => ({ id, status, seller: { id: 9 }, date_created: '2026-10-15T13:00:00Z', order_items: ids.map(id => ({ item: { id } })) });
describe('experiência por anúncio', () => {
  it('consulta somente curva A de faturamento com fronteira 80%', () => {
    const itens = [80, 15, 5].map((faturamentoCents, i) => ({ mlb: `MLB${i}`, titulo: '', sku: null, unidades: 1, pedidos: 1, ultimaVenda: null, status: null, faturamentoCents }));
    expect(anunciosExperienciaA(itens)).toEqual(['MLB0']);
  });
  it('ausência de reclamações e atrasos não aumenta confiança', () => { expect(notaExperienciaLida({ item_id: 'MLB1', vendas: 30, cancelamentos: 0, reclamacoes: null, atrasos: null, disponivel: true }).nota).toBeNull(); });
  it('mínimo de 20 vendas para pontuar', () => { expect(notarExperiencia({ vendas: 19, reclamacoes: 0, atrasos: 0, cancelamentos: 0 }).nota).toBeNull(); expect(notarExperiencia({ vendas: 20, reclamacoes: 0, atrasos: 0, cancelamentos: 0 }).nota).toBe(1); });
  it('pedidos cancelados distintos sem multiplicar por unidades nem duplicatas', () => { const rows = experienciaPedidos([order(1, 'paid'), order(2, 'cancelled'), order(2, 'cancelled')], '9', '2026-10-08', '2026-11-06'); expect(rows[0]).toMatchObject({ vendas: 1, cancelamentos: 1, reclamacoes: null, atrasos: null }); });
  it('cancelamento multi-item não prova qual anúncio causou ocorrência', () => { expect(experienciaPedidos([order(1, 'cancelled', ['MLB1', 'MLB2'])], '9', '2026-10-08', '2026-11-06').every(r => r.cancelamentos === null)).toBe(true); });
  it('exclui pedidos fora da janela', () => { expect(experienciaPedidos([order(1, 'cancelled')], '9', '2026-10-16', '2026-11-14')).toEqual([]); });
  it('recusa pedidos de outra loja', () => { expect(() => experienciaPedidos([order(1, 'paid')], '10', '2026-10-08', '2026-11-06')).toThrow(); });
});