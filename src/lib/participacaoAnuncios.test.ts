import { describe, it, expect } from 'vitest';
import { filtrarParticipacao, type AnuncioParticipacao } from './participacaoAnuncios';
const item = (id: string, ids: string[]): AnuncioParticipacao => ({ item_id: id, titulo: id, status: 'active', promocoes: ids.map(id => ({ id, nome: id, status: 'active', inicio: null, fim: null })) });
describe('participação atual dos anúncios', () => {
  it('com promoção inclui uma ou várias participações', () => { expect(filtrarParticipacao([item('A', []), item('B', ['p']), item('C', ['p','q'])], 'com', true).map(i => i.item_id)).toEqual(['B', 'C']); });
  it('lista fora de promoções apenas com ausência confirmada', () => { expect(filtrarParticipacao([item('A', []), item('B', ['p'])], 'fora', true).map(i => i.item_id)).toEqual(['A']); });
  it('duas ou mais conta promoções distintas, não ofertas duplicadas', () => { expect(filtrarParticipacao([item('A', ['p','p']), item('B', ['p','q'])], 'multiplas', true).map(i => i.item_id)).toEqual(['B']); });
  it('cobertura incompleta nunca classifica ausência como zero', () => { expect(filtrarParticipacao([item('A', [])], 'fora', false)).toEqual([]); });
  for (const n of [1, 2, 3]) it(`filtra exatamente ${n} promoções distintas`, () => {
    const itens = [item('A', ['p', 'p']), item('B', ['p', 'q']), item('C', ['p', 'q', 'r']), item('D', ['p', 'q', 'r', 's'])];
    expect(filtrarParticipacao(itens, String(n), true).map(i => i.item_id)).toEqual([['A', 'B', 'C'][n - 1]]);
  });
  it('combina quantidade com fim confirmado nos próximos sete dias, incluindo limites', () => {
    const agora = Date.parse('2026-11-09T00:00:00Z');
    const criar = (id: string, fim: string | null, status = 'active') => {
      const i = item(id, ['p', 'q']); i.promocoes[0] = { ...i.promocoes[0], fim, status }; return i;
    };
    const itens = [criar('agora', '2026-11-09T00:00:00Z'), criar('limite', '2026-11-16T00:00:00Z', 'programmed'), criar('depois', '2026-11-16T00:00:01Z'), criar('vencida', '2026-11-08T23:59:59Z'), criar('ausente', null), criar('invalida', 'x'), criar('convite', '2026-11-10T00:00:00Z', 'candidate'), item('uma', ['p'])];
    expect(filtrarParticipacao(itens, '2', true, 7, agora).map(i => i.item_id)).toEqual(['agora', 'limite']);
    expect(filtrarParticipacao(itens, 'fora', false, 7, agora)).toEqual([]);
  });
});