import { describe, expect, it } from 'vitest';
import { classificarAbc, cruzarAbc, type ItemVendas } from './curvaAbc';
import { agregarPedidosAbc, lerCatalogoAbc } from '../../../supabase/functions/ml-analise-loja/abcPedidos';
const item = (mlb: string, faturamentoCents: number, unidades = 1): ItemVendas => ({ mlb, titulo: mlb, sku: null, faturamentoCents, unidades, pedidos: 1, ultimaVenda: null, status: null });
describe('Curva ABC aprovada', () => {
  it('aplica cortes 80 e 95 pela contribuição anterior', () => {
    expect(classificarAbc([item('1', 80), item('2', 15), item('3', 5)], 'faturamento').itens.map(i => i.classe)).toEqual(['A', 'B', 'C']);
  });
  it('mantém dominante acima de 80 em A', () => { expect(classificarAbc([item('1', 96), item('2', 4)], 'faturamento').itens[0].classe).toBe('A'); });
  it('mantém empate na mesma classe ao cruzar 80', () => { expect(classificarAbc([item('1', 70), item('2', 15), item('3', 15)], 'faturamento').itens.map(i => i.classe)).toEqual(['A', 'A', 'A']); });
  it('separa zero medido e aceita período sem movimento', () => { const r = classificarAbc([item('1', 0, 0)], 'faturamento'); expect(r.totalBase).toBe(0); expect(r.itens).toHaveLength(0); expect(r.semMovimento).toHaveLength(1); });
  it('não omite item com movimento em apenas uma base', () => { const dados = [item('1', 0, 10), item('2', 100, 1)]; const r = cruzarAbc(classificarAbc(dados, 'faturamento'), classificarAbc(dados, 'unidades')); expect(r.find(i => i.mlb === '1')?.classeFaturamento).toBeNull(); expect(r.find(i => i.mlb === '1')?.classeUnidades).toBe('A'); });
  it('rejeita cortes inválidos', () => { expect(() => classificarAbc([], 'faturamento', { a: .95, b: .8 })).toThrow(); });
  it('não aceita duplicatas de MLB', () => { expect(() => classificarAbc([item('1', 1), item('1', 1)], 'unidades')).toThrow(); });
});
const pedido = (id = 1, status = 'paid') => ({ id, status, seller: { id: 99 }, currency_id: 'BRL', date_created: '2026-11-01T12:00:00Z', order_items: [{ item: { id: 'MLB123', title: 'Produto' }, quantity: 3, unit_price: 1.01 }] });
describe('Pedidos e catálogo completos', () => {
  it('deduplica pedido e preserva centavos por linha', () => { const r = agregarPedidosAbc([pedido(), pedido()], '99', '2026-11-01', '2026-11-02'); expect(r[0].faturamentoCents).toBe(303); expect(r[0].unidades).toBe(3); expect(r[0].pedidos).toBe(1); });
  it('exclui cancelados e outros status', () => { expect(agregarPedidosAbc([pedido(1, 'cancelled'), pedido(2, 'pending')], '99', '2026-11-01', '2026-11-02')).toEqual([]); });
  it('suspende quando falta valor pago', () => { const p = pedido(); expect(() => agregarPedidosAbc([{ ...p, order_items: [{ ...p.order_items[0], unit_price: null }] }], '99', '2026-11-01', '2026-11-02')).toThrow(); });
  it('rejeita pedidos de outra loja', () => { expect(() => agregarPedidosAbc([pedido()], '100', '2026-11-01', '2026-11-02')).toThrow(); });
  it('conta um pedido por item com múltiplas linhas', () => { const p = pedido(); p.order_items.push(p.order_items[0]); const r = agregarPedidosAbc([p], '99', '2026-11-01', '2026-11-02'); expect(r[0].pedidos).toBe(1); expect(r[0].unidades).toBe(6); });
  it('suspende catálogo sem confirmação de paginação', async () => { await expect(lerCatalogoAbc(async () => ({ results: ['MLB123'] }), '99')).rejects.toThrow(); });
  it('lê ativos e pausados até fim confirmado', async () => { const chamadas: string[] = []; const r = await lerCatalogoAbc(async path => { chamadas.push(path); return path.includes('scroll_id') ? { results: [] } : { results: [path.includes('active') ? 'MLB1' : 'MLB2'], scroll_id: 's' }; }, '99'); expect(r).toEqual(['MLB1', 'MLB2']); expect(chamadas).toHaveLength(4); });
});