import { describe, expect, it } from 'vitest';
import { serieCampanha, tacosCampanha } from '@/lib/campanhaEvolucao';
const linha = (dia: string, cost: number | null, total_amount = 100) => ({ dia, cost, total_amount, clicks: 10, prints: 100, units_quantity: 1 });
describe('Evolução das campanhas', () => {
  it('pareia vendas e investimento na mesma data e preserva lacunas', () => {
    const s = serieCampanha([linha('2026-10-28', null), linha('2026-10-27', 20)], []);
    expect(s.map(d => [d.dia, d.vendas, d.investimento])).toEqual([['2026-10-27', 100, 20], ['2026-10-28', 100, null]]);
    expect(s[1].acos).toBeNull(); expect(s[1].roas).toBeNull();
  });
  it('calcula TACOS pelos totais da loja, não receita atribuída nem média diária', () => {
    expect(tacosCampanha([linha('2026-10-27', 20), linha('2026-10-28', 80)], [{ data: '2026-10-27', faturamento: 1000 }, { data: '2026-10-28', faturamento: 9000 }], '2026-10-27', '2026-10-28')).toBe(0.01);
  });
  it('não calcula TACOS com dia ausente ou custo desconhecido', () => {
    const f = [{ data: '2026-10-27', faturamento: 1000 }, { data: '2026-10-28', faturamento: 9000 }];
    expect(tacosCampanha([linha('2026-10-27', 20)], f, '2026-10-27', '2026-10-28')).toBeNull();
    expect(tacosCampanha([linha('2026-10-27', null)], f, '2026-10-27', '2026-10-27')).toBeNull();
    expect(tacosCampanha([linha('2026-10-27', 0)], f, '2026-10-27', '2026-10-27')).toBe(0);
  });
});