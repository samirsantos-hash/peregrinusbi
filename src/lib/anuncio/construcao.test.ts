import { describe, expect, it } from 'vitest';
import { notasConstrucaoLida, type ConstrucaoLida } from './construcao';
import { montarDimensoes } from './diagnostico';
import { notarFichaTecnica, notarFotos, notarExposicaoComercial } from './dimensoes';
import { lerConstrucaoAnuncios, projetarConstrucao } from '../../../supabase/functions/ml-analise-loja/construcaoAnuncios';

const item: ConstrucaoLida = { item_id: 'MLB123', preco: 100, moeda: 'BRL', tipo: 'gold_pro', envio: null, fotos: [], atributos: [], categoria: [{ id: 'BRAND', name: 'Marca', tags: { required: true } }] };

describe('construção por anúncio', () => {
  it('preço desconhecido não aciona aviso de margem por tipo', () => {
    expect(notarExposicaoComercial({ free_shipping: true, logistic_type: 'fulfillment' }, 'gold_special', Number.NaN).acao).toBeNull();
  });
  it('foto ausente confirmada recebe zero, não nota ausente', () => {
    const d = montarDimensoes({ medidas: notasConstrucaoLida(item) }, 1);
    expect(d.find(d => d.dimensao === 'fotos')?.nota).toBe(0);
  });
  it('preço atual não inventa competitividade sem referência', () => {
    expect(notasConstrucaoLida(item).preco?.nota).toBeNull();
    expect(notasConstrucaoLida(item).preco?.evidencia).toContain('100,00');
  });
  it('ficha sem leitura não vira ficha vazia', () => {
    expect(notasConstrucaoLida({ ...item, atributos: null }).fichaTecnica?.nota).toBeNull();
  });
  it('não inclui atributos de outra categoria na cobertura geral', () => {
    const n = notarFichaTecnica([{ id: 'OTHER', name: 'Outro', value_name: 'Sim' }], item.categoria);
    expect(n.nota).toBe(0);
  });
  it('dimensões originais incompletas não recebem nota de fotos', () => {
    expect(notarFotos([{ id: '1', max_size: '1200x1200' }, { id: '2', max_size: '' }]).nota).toBeNull();
  });
});

describe('coleta restrita em lotes', () => {
  it('projeta só campos permitidos, usa max_size e valores compostos', () => {
    const p = projetarConstrucao({ id: 'MLB123', price: 100, buyer: { name: 'Nunca retornar' }, pictures: [{ id: '1', size: '500x500', max_size: '1200x1200' }], attributes: [{ id: 'BRAND', values: [{ name: 'Marca' }] }] }, null);
    expect(p.fotos).toEqual([{ id: '1', max_size: '1200x1200' }]);
    expect(p.atributos?.[0].value_name).toBe('Marca');
    expect(p).not.toHaveProperty('buyer');
  });
  it('bloqueia anúncio de outra loja', async () => {
    await expect(lerConstrucaoAnuncios(async () => [{ code: 200, body: { id: 'MLB123', seller_id: 999 } }], '123', ['MLB123'])).rejects.toThrow('fora da loja');
  });
  it('limita o lote a 20 anúncios', async () => {
    await expect(lerConstrucaoAnuncios(async () => [], '123', Array.from({ length: 21 }, (_, i) => `MLB${i}`))).rejects.toThrow('20');
  });
  it('item recusado continua indisponível sem zero fabricado', async () => {
    const r = await lerConstrucaoAnuncios(async () => null, '123', ['MLB123']);
    expect(r.itens).toEqual([]); expect(r.indisponiveis).toEqual(['MLB123']); expect(r.coberturaCompleta).toBe(false);
  });
  it('categorias compartilhadas são lidas uma vez', async () => {
    let categorias = 0;
    const r = await lerConstrucaoAnuncios(async path => {
      if (path.startsWith('/items?')) return ['MLB123', 'MLB124'].map(id => ({ code: 200, body: { id, seller_id: 123, category_id: 'MLB765432', pictures: [], attributes: [] } }));
      categorias++; return [{ id: 'BRAND', name: 'Marca', tags: { required: true } }];
    }, '123', ['MLB123', 'MLB124']);
    expect(categorias).toBe(1); expect(r.itens.length).toBe(2); expect(r.coberturaCompleta).toBe(true);
  });
});