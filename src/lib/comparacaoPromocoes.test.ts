import { expect, it } from 'vitest';
import { compararPromocoes } from './comparacaoPromocoes';
import { linhasVinculo, type VendasPromocao, type PromoAtual } from './vinculoPromocao';
const promo: PromoAtual = { promotion_id: 'A', tipo: 'DEAL', nome: 'A', nome_tipo: 'Oferta', status: 'active', inicio: null, fim: null };
const vendas: VendasPromocao = { completo: false, naoLidos: 2, porPromocao: [{ id: 'A', tipo: 'DEAL', pedidos: 2, unidades: 4, faturamento: 200 }, { id: 'B', tipo: 'DEAL', pedidos: 5, unidades: 5, faturamento: 300 }], semDesconto: { pedidos: 0, unidades: 0, faturamento: 0 }, descontoSemPromocao: { pedidos: 3, unidades: 3, faturamento: 900 } };
it('ordena somente vendas com identidade comprovada, sem somar os descontos desconhecidos', () => {
  const r = compararPromocoes(linhasVinculo([promo, promo], vendas), 'faturamento');
  expect(r.map(v => v.valor)).toEqual([300, 200]);
  expect(r).toHaveLength(2);
});
it('calcula ticket por faturamento dividido por pedidos e ordena por essa métrica', () => {
  expect(compararPromocoes(linhasVinculo([promo], vendas), 'ticket').map(v => v.valor)).toEqual([100, 60]);
});
it('não inclui participação atual sem venda comprovada, nem a converte em zero', () => {
  expect(compararPromocoes(linhasVinculo([promo], { ...vendas, porPromocao: [] }), 'pedidos')).toEqual([]);
});
it('mantém zero medido mas não calcula ticket sem pedidos', () => {
  const linhas = linhasVinculo([], { ...vendas, porPromocao: [{ id: 'Z', tipo: 'DEAL', pedidos: 0, unidades: 0, faturamento: 0 }] });
  expect(compararPromocoes(linhas, 'faturamento')[0].valor).toBe(0);
  expect(compararPromocoes(linhas, 'ticket')).toEqual([]);
});