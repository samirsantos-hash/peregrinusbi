import { describe, it, expect } from 'vitest';
import { filtrarParticipacao, type AnuncioParticipacao } from './participacaoAnuncios';
const item = (id: string, ids: string[]): AnuncioParticipacao => ({ item_id: id, titulo: id, status: 'active', promocoes: ids.map(id => ({ id, nome: id, status: 'active', inicio: null, fim: null })) });
describe('participação atual dos anúncios', () => {
  it('com promoção inclui uma ou várias participações', () => { expect(filtrarParticipacao([item('A', []), item('B', ['p']), item('C', ['p','q'])], 'com', true).map(i => i.item_id)).toEqual(['B', 'C']); });
  it('lista fora de promoções apenas com ausência confirmada', () => { expect(filtrarParticipacao([item('A', []), item('B', ['p'])], 'fora', true).map(i => i.item_id)).toEqual(['A']); });
  it('duas ou mais conta promoções distintas, não ofertas duplicadas', () => { expect(filtrarParticipacao([item('A', ['p','p']), item('B', ['p','q'])], 'multiplas', true).map(i => i.item_id)).toEqual(['B']); });
  it('cobertura incompleta nunca classifica ausência como zero', () => { expect(filtrarParticipacao([item('A', [])], 'fora', false)).toEqual([]); });
});