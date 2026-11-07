import { describe, it, expect } from 'vitest';
import { referenciasResposta, notasResposta, medianaMedida } from './resposta';
import { diagnosticar, montarDimensoes } from './diagnostico';
import { lerRespostaAnuncios, validarPeriodoResposta } from '../../../supabase/functions/ml-analise-loja/respostaAnuncios';

describe('Resposta por anúncio', () => {
  it('calcula conversão com pedidos pagos, não unidades, e compara com mediana', () => {
    const refs = referenciasResposta([{ visitas: 100, pedidos: 10 }, { visitas: 200, pedidos: 10 }]);
    expect(refs.conversao).toBeCloseTo(.075);
    expect(notasResposta(100, 10, refs).conversao.nota).toBeCloseTo(2 / 3);
  });
  it('inclui taxa zero medida e exclui ausência da referência', () => {
    expect(medianaMedida([0, .1, null])).toBe(.05);
    expect(referenciasResposta([{ visitas: 100, pedidos: 0 }, { visitas: null, pedidos: 10 }, { visitas: 100, pedidos: 10 }]).conversao).toBe(.05);
  });
  it('50 visitas permite nota; 49 não', () => {
    const refs = referenciasResposta([{ visitas: 100, pedidos: 10 }]);
    expect(notasResposta(49, 3, refs).conversao.nota).toBeNull();
    expect(notasResposta(50, 5, refs).conversao.nota).toBe(.5);
  });
  it('ausência nunca vira zero e zero confirmado pontua visitas', () => {
    const refs = referenciasResposta([{ visitas: 100, pedidos: 10 }]);
    expect(notasResposta(null, 0, refs).visitasRelativas.nota).toBeNull();
    expect(notasResposta(null, 0, refs).conversao.nota).toBeNull();
    expect(notasResposta(0, 0, refs).visitasRelativas.nota).toBe(0);
  });
  it('mediana de conversão zero não inventa nota', () => {
    const refs = referenciasResposta([{ visitas: 100, pedidos: 0 }]);
    expect(notasResposta(100, 0, refs).conversao.nota).toBeNull();
  });
  it('cobertura Resposta soma 160/245 sem inventar experiência', () => {
    const refs = referenciasResposta([{ visitas: 100, pedidos: 10 }]);
    const d = diagnosticar('MLB1', montarDimensoes({}, 1, notasResposta(100, 10, refs)));
    expect(d.resposta.cobertura).toBeCloseTo(160 / 245);
    expect(d.resposta.dimensoes.find(x => x.dimensao === 'experiencia')?.nota).toBeNull();
    expect(d.confianca).toBe('baixa');
  });
});

describe('leitura de visitas por lote', () => {
  it('exige exatamente 30 dias completos', () => {
    expect(() => validarPeriodoResposta('2026-10-08', '2026-11-06', new Date('2026-11-07'))).not.toThrow();
    expect(() => validarPeriodoResposta('2026-10-09', '2026-11-06', new Date('2026-11-07'))).toThrow();
    expect(() => validarPeriodoResposta('2026-10-09', '2026-11-07', new Date('2026-11-07'))).toThrow();
  });
  it('mantém datas, zero medido e null em falha, sem consultar pedidos', async () => {
    const paths: string[] = [];
    const get = async (path: string) => {
      paths.push(path);
      if (path.startsWith('/items?')) return [{ code: 200, body: { id: 'MLB1', seller_id: 123 } }, { code: 200, body: { id: 'MLB2', seller_id: 123 } }];
      if (path.includes('ids=MLB1,MLB2')) return [{ item_id: 'MLB1', total_visits: 0 }];
      throw new Error('unavailable');
    };
    const r = await lerRespostaAnuncios(get, '123', ['MLB1', 'MLB2'], '2026-10-08', '2026-11-06');
    expect(r.itens).toEqual([{ item_id: 'MLB1', visitas: 0 }, { item_id: 'MLB2', visitas: null }]);
    expect(r.coberturaCompleta).toBe(false);
    expect(paths.filter(p => p.includes('/visits')).every(p => p.endsWith('date_from=2026-10-08&date_to=2026-11-06'))).toBe(true);
    expect(paths.some(p => p.includes('/orders'))).toBe(false);
  });
  it('recusa anúncio de outra loja antes de ler visitas', async () => {
    const paths: string[] = [];
    await expect(lerRespostaAnuncios(async path => { paths.push(path); return [{ code: 200, body: { id: 'MLB1', seller_id: 999 } }]; }, '123', ['MLB1'], '2026-10-08', '2026-11-06')).rejects.toThrow('fora da loja');
    expect(paths).toHaveLength(1);
  });
  it('limita o lote a 20 anúncios distintos', async () => {
    await expect(lerRespostaAnuncios(async () => null, '123', Array.from({ length: 21 }, (_, i) => `MLB${i}`), '2026-10-08', '2026-11-06')).rejects.toThrow('1 a 20');
    await expect(lerRespostaAnuncios(async () => null, '123', ['MLB1', 'MLB1'], '2026-10-08', '2026-11-06')).rejects.toThrow('distintos');
  });
});