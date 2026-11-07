import { describe, it, expect } from 'vitest';
import { SEM_PROMOCAO, diagnosticar, perfilarCatalogo, montarDimensoes, notaGiro, mediana, type NotaDimensao } from './diagnostico';

const dim = (dimensao: any, peso: number, nota: number | null): NotaDimensao => ({ dimensao, peso, nota, evidencia: '', acao: nota !== null && nota < 0.5 ? 'corrigir' : null });
const dims = (c: (number | null)[], r: (number | null)[]) => [dim('promocoes', 95, c[0]), dim('preco', 65, c[1]), dim('fotos', 40, c[2]), dim('titulo', 40, c[3]), dim('experiencia', 85, r[0]), dim('conversao', 70, r[1])];

describe('quadrantes', () => {
  it('construção fraca com resposta forte é potencial reprimido', () => {
    const d = diagnosticar('1', dims([0.2, 0.3, 0.2, 0.3], [0.9, 0.9]));
    expect(d.quadrante).toBe('potencial_reprimido'); expect(d.acaoPrincipal).toBeTruthy();
  });
  it('construção forte com resposta fraca aponta produto, não cadastro', () => {
    const d = diagnosticar('2', dims([0.9, 0.9, 0.9, 0.9], [0.2, 0.2]));
    expect(d.quadrante).toBe('produto_ou_demanda'); expect(d.acaoPrincipal).toMatch(/demanda|posicionamento/i);
  });
  it('saudável não sugere ação', () => {
    expect(diagnosticar('3', dims([0.9, 0.9, 0.9, 0.9], [0.9, 0.9])).acaoPrincipal).toBeNull();
  });
  it('sem um dos eixos não emite quadrante', () => {
    const d = diagnosticar('4', dims([0.9, 0.9, 0.9, 0.9], [null, null]));
    expect(d.quadrante).toBeNull(); expect(d.leitura).toMatch(/indispon[íi]vel/i);
  });
  it('corte de construção 60: índice 59 é fraco, 60 é forte', () => {
    expect(diagnosticar('5', [dim('fotos', 40, 0.59), dim('giro', 40, 0.9)]).quadrante).toBe('potencial_reprimido');
    expect(diagnosticar('6', [dim('fotos', 40, 0.6), dim('giro', 40, 0.9)]).quadrante).toBe('saudavel');
  });
});

describe('notas não medidas', () => {
  it('nota 0 ou ausente fica fora, não vira zero', () => {
    const d = diagnosticar('7', montarDimensoes({ fotos: 80, promocoes: 0 }, 1));
    expect(d.construcao.indice).toBe(80);
    expect(d.construcao.cobertura).toBeCloseTo(40 / 415);
    expect(d.confianca).toBe('baixa');
  });
  it('giro usa mediana dos itens com venda e exige base', () => {
    expect(mediana([0, 2, 4, 10])).toBe(4);
    expect(notaGiro(2, 4)).toBe(0.5); expect(notaGiro(0, 4)).toBe(0); expect(notaGiro(3, null)).toBeNull();
  });
});

describe('perfil do catálogo', () => {
  it('identifica o quadrante dominante e o gargalo recorrente', () => {
    const ds = [diagnosticar('1', dims([0.2, 0.5, 0.9, 0.9], [0.9, 0.9])), diagnosticar('2', dims([0.2, 0.5, 0.9, 0.9], [0.9, 0.9])), diagnosticar('3', dims([0.9, 0.9, 0.9, 0.9], [0.9, 0.9]))];
    const p = perfilarCatalogo(ds, new Map([['1', 100000], ['2', 80000], ['3', 50000]]));
    expect(p.quadranteDominante).toBe('potencial_reprimido');
    expect(p.gargaloRecorrente?.dimensao).toBe('promocoes');
    expect(p.distribuicao.potencial_reprimido.faturamentoCents).toBe(180000);
  });
  it('erro quando nada pôde ser diagnosticado', () => { expect(() => perfilarCatalogo([], new Map())).toThrow(); });
});

describe('construção a partir do anúncio', () => {
  it('sem promoção atual é medido como zero e vira gargalo', () => {
    const d = diagnosticar('8', montarDimensoes({ promocoes: SEM_PROMOCAO, envio: { envio: { free_shipping: true, logistic_type: "fulfillment" }, tipo: "gold_pro", precoCents: 5000 } }, 1));
    expect(d.construcao.indice).toBeCloseTo(100 / 195 * 100);
    expect(d.construcao.gargalo?.dimensao).toBe('promocoes');
  });
});
