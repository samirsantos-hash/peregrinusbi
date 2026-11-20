import { describe, expect, it } from 'vitest';
import { anunciosMaisCancelados } from './cancelamentos';

describe('anúncios mais afetados por cancelamentos', () => {
  it('ordena por cancelamentos, não por pedidos pagos', () => {
    const r = anunciosMaisCancelados([{ item_id: 'MLB1', vendas: 100, cancelamentos: 2 }, { item_id: 'MLB2', vendas: 10, cancelamentos: 9 }], new Map());
    expect(r.map(i => i.item_id)).toEqual(['MLB2', 'MLB1']);
  });
  it('não classifica vínculo ausente como zero ou como ocorrência confirmada', () => {
    expect(anunciosMaisCancelados([{ item_id: 'MLB1', vendas: 20, cancelamentos: null }, { item_id: 'MLB2', vendas: 20, cancelamentos: 0 }], new Map())).toEqual([]);
  });
  it('taxa usa pedidos pagos mais cancelados da mesma coorte', () => {
    const [r] = anunciosMaisCancelados([{ item_id: 'MLB1', vendas: 129, cancelamentos: 9 }], new Map([['MLB1', 'Peça']]));
    expect(r.taxa).toBe(9 / 138);
    expect(r.titulo).toBe('Peça');
  });
});