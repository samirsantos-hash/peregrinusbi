// Diagnóstico em dois eixos (Construção × Resposta). Funções puras; nota nula = não medida, nunca zero.
import { notarExposicaoComercial, type ShippingItem, type NotaParcial } from './dimensoes';
export type Dimensao = 'exposicaoComercial' | 'promocoes' | 'preco' | 'fichaTecnica' | 'fotos' | 'titulo' | 'descricao' | 'experiencia' | 'conversao' | 'visitasRelativas' | 'giro';
export type Eixo = 'construcao' | 'resposta';
export interface NotaDimensao { dimensao: Dimensao; peso: number; nota: number | null; evidencia: string; acao: string | null }
export type Quadrante = 'saudavel' | 'potencial_reprimido' | 'produto_ou_demanda' | 'falha_dupla';

/** Pesos v2: construção 415, resposta 245. */
export const PESOS: Record<Dimensao, number> = { exposicaoComercial: 100, promocoes: 95, preco: 65, fichaTecnica: 45, fotos: 40, titulo: 40, descricao: 30, experiencia: 85, conversao: 70, visitasRelativas: 50, giro: 40 };
export const EIXO_DA_DIMENSAO: Record<Dimensao, Eixo> = { exposicaoComercial: 'construcao', fichaTecnica: 'construcao', promocoes: 'construcao', preco: 'construcao', fotos: 'construcao', titulo: 'construcao', descricao: 'construcao', experiencia: 'resposta', conversao: 'resposta', visitasRelativas: 'resposta', giro: 'resposta' };
export const ROTULO_DIMENSAO: Record<Dimensao, string> = { exposicaoComercial: 'Exposição comercial', fichaTecnica: 'Ficha técnica', promocoes: 'Promoções', preco: 'Preço', fotos: 'Fotos', titulo: 'Título', descricao: 'Descrição', experiencia: 'Experiência de compra', conversao: 'Conversão', visitasRelativas: 'Visitas relativas', giro: 'Giro' };
export const ROTULO_QUADRANTE: Record<Quadrante, string> = { saudavel: 'Saudável', potencial_reprimido: 'Potencial reprimido', produto_ou_demanda: 'Produto ou demanda', falha_dupla: 'Falha dupla' };

export interface NotaEixo { eixo: Eixo; indice: number | null; cobertura: number; dimensoes: NotaDimensao[]; gargalo: NotaDimensao | null }
export interface Diagnostico { mlb: string; construcao: NotaEixo; resposta: NotaEixo; quadrante: Quadrante | null; leitura: string; acaoPrincipal: string | null; lacunaMaior: number; confianca: 'alta' | 'media' | 'baixa' }
export interface CortesDiagnostico { construcao: number; resposta: number }
export const CORTES_PADRAO: CortesDiagnostico = { construcao: 60, resposta: 50 };

const lacuna = (d: NotaDimensao) => (1 - d.nota!) * d.peso;
const pesoEixo = (e: Eixo) => (Object.keys(PESOS) as Dimensao[]).filter(d => EIXO_DA_DIMENSAO[d] === e).reduce((s, d) => s + PESOS[d], 0);

function agregarEixo(dimensoes: NotaDimensao[], eixo: Eixo): NotaEixo {
  const medidas = dimensoes.filter(d => d.nota !== null);
  const pesoMedido = medidas.reduce((s, d) => s + d.peso, 0);
  if (pesoMedido === 0) return { eixo, indice: null, cobertura: 0, dimensoes, gargalo: null };
  const pontos = medidas.reduce((s, d) => s + d.nota! * d.peso, 0);
  const gargalo = [...medidas].filter(d => d.nota! < 1).sort((a, b) => lacuna(b) - lacuna(a))[0] ?? null;
  return { eixo, indice: (pontos / pesoMedido) * 100, cobertura: pesoMedido / pesoEixo(eixo), dimensoes, gargalo };
}

const LEITURAS: Record<Quadrante, string> = {
  saudavel: 'Construção e resposta alinhadas. Não alterar sem motivo — mudanças aqui arriscam mais do que ganham.',
  potencial_reprimido: 'Vende apesar do cadastro. Corrigir a construção tende a ter o maior retorno do catálogo.',
  produto_ou_demanda: 'Cadastro correto e sem resultado. Investigar demanda, preço de mercado e posicionamento antes de mexer no anúncio.',
  falha_dupla: 'Construção e resposta fracas. Refazer o cadastro do zero ou avaliar retirar o item do catálogo.',
};

export function diagnosticar(mlb: string, dimensoes: NotaDimensao[], cortes: CortesDiagnostico = CORTES_PADRAO): Diagnostico {
  const construcao = agregarEixo(dimensoes.filter(d => EIXO_DA_DIMENSAO[d.dimensao] === 'construcao'), 'construcao');
  const resposta = agregarEixo(dimensoes.filter(d => EIXO_DA_DIMENSAO[d.dimensao] === 'resposta'), 'resposta');
  let quadrante: Quadrante | null = null;
  if (construcao.indice !== null && resposta.indice !== null) {
    const cF = construcao.indice < cortes.construcao, rF = resposta.indice < cortes.resposta;
    quadrante = !cF && !rF ? 'saudavel' : cF && !rF ? 'potencial_reprimido' : !cF && rF ? 'produto_ou_demanda' : 'falha_dupla';
  }
  const pior = [construcao.gargalo, resposta.gargalo].filter((g): g is NotaDimensao => g !== null).sort((a, b) => lacuna(b) - lacuna(a))[0] ?? null;
  const acaoPrincipal = quadrante === 'produto_ou_demanda' ? 'Revisar demanda, preço de mercado e posicionamento antes de alterar o cadastro.'
    : quadrante === 'saudavel' || quadrante === null ? null : (construcao.gargalo?.acao ?? pior?.acao ?? null);
  const cob = (construcao.cobertura + resposta.cobertura) / 2;
  return {
    mlb, construcao, resposta, quadrante,
    leitura: quadrante ? LEITURAS[quadrante] : 'Diagnóstico indisponível: um dos eixos não pôde ser medido.',
    acaoPrincipal, lacunaMaior: pior ? lacuna(pior) : 0,
    confianca: cob >= 0.8 ? 'alta' : cob >= 0.5 ? 'media' : 'baixa',
  };
}

export interface PerfilCatalogo {
  anuncios: number; diagnosticados: number;
  distribuicao: Record<Quadrante, { itens: number; participacao: number; faturamentoCents: number }>;
  quadranteDominante: Quadrante;
  gargaloRecorrente: { dimensao: Dimensao; ocorrencias: number; participacao: number } | null;
  leitura: string;
  /** Algum eixo deixa mais de 90% dos itens do mesmo lado do corte. */
  corteSemSeparacao: boolean;
}
const LEITURA_CATALOGO: Record<Quadrante, string> = {
  potencial_reprimido: 'A maior parte do catálogo vende apesar do cadastro. O problema da loja é execução, não portfólio — correção de cadastro em lote não depende de mudar produto nem preço.',
  produto_ou_demanda: 'A maior parte do catálogo tem cadastro correto e não converte. O problema está em portfólio, faixa de preço ou demanda da categoria.',
  falha_dupla: 'A maior parte do catálogo falha nos dois eixos. Antes de corrigir anúncio a anúncio, vale decidir quais itens permanecem.',
  saudavel: 'Catálogo em boa condição. O ganho está nos itens fora do padrão, não em ação ampla.',
};
export const QUADRANTES: Quadrante[] = ['saudavel', 'potencial_reprimido', 'produto_ou_demanda', 'falha_dupla'];

export function perfilarCatalogo(ds: Diagnostico[], fat: Map<string, number>, cortes: CortesDiagnostico = CORTES_PADRAO): PerfilCatalogo {
  const validos = ds.filter(d => d.quadrante !== null);
  if (validos.length === 0) throw new Error('Nenhum anúncio pôde ser diagnosticado — verifique a cobertura dos insumos.');
  const distribuicao = {} as PerfilCatalogo['distribuicao'];
  for (const q of QUADRANTES) {
    const g = validos.filter(d => d.quadrante === q);
    distribuicao[q] = { itens: g.length, participacao: g.length / validos.length, faturamentoCents: g.reduce((s, d) => s + (fat.get(d.mlb) ?? 0), 0) };
  }
  const quadranteDominante = QUADRANTES.reduce((a, b) => distribuicao[a].itens >= distribuicao[b].itens ? a : b);
  const cont = new Map<Dimensao, number>();
  for (const d of validos) for (const g of [d.construcao.gargalo, d.resposta.gargalo]) if (g) cont.set(g.dimensao, (cont.get(g.dimensao) ?? 0) + 1);
  const topo = [...cont.entries()].sort((a, b) => b[1] - a[1])[0];
  const fracC = validos.filter(d => d.construcao.indice! < cortes.construcao).length / validos.length;
  const fracR = validos.filter(d => d.resposta.indice! < cortes.resposta).length / validos.length;
  return {
    anuncios: ds.length, diagnosticados: validos.length, distribuicao, quadranteDominante,
    gargaloRecorrente: topo ? { dimensao: topo[0], ocorrencias: topo[1], participacao: topo[1] / validos.length } : null,
    leitura: LEITURA_CATALOGO[quadranteDominante],
    corteSemSeparacao: validos.length >= 10 && [fracC, fracR].some(f => f > 0.9 || f < 0.1),
  };
}

export const prioridade = (d: Diagnostico, fatCents: number) => d.lacunaMaior * Math.log10(fatCents / 100 + 10);

export function filaDeAcao(ds: Diagnostico[], fat: Map<string, number>, quadrantes: Quadrante[] = ['potencial_reprimido', 'falha_dupla'], limite = 50) {
  return ds.filter(d => d.quadrante !== null && quadrantes.includes(d.quadrante)).map(d => {
    const f = fat.get(d.mlb) ?? 0;
    return { mlb: d.mlb, quadrante: d.quadrante!, construcao: d.construcao.indice, resposta: d.resposta.indice, gargalo: d.construcao.gargalo?.dimensao ?? d.resposta.gargalo?.dimensao ?? null, acao: d.acaoPrincipal, faturamentoCents: f, prioridade: prioridade(d, f), confianca: d.confianca };
  }).sort((a, b) => b.prioridade - a.prioridade || a.mlb.localeCompare(b.mlb)).slice(0, limite);
}

export function lotesDeCorrecao(fila: ReturnType<typeof filaDeAcao>) {
  const lotes = new Map<string, typeof fila>();
  for (const i of fila) { const k = i.gargalo ?? 'indefinido'; lotes.set(k, [...(lotes.get(k) ?? []), i]); }
  return [...lotes.entries()].map(([gargalo, itens]) => ({ gargalo, itens, faturamentoEmJogo: itens.reduce((s, i) => s + i.faturamentoCents, 0), prioridadeTotal: itens.reduce((s, i) => s + i.prioridade, 0), acaoComum: itens[0].acao })).sort((a, b) => b.prioridadeTotal - a.prioridadeTotal);
}

/** Notas de 0–100 registradas para o anúncio; 0 ou ausente = não medida. */
export interface InsumosConstrucao { medidas?: Partial<Record<'fotos' | 'fichaTecnica' | 'preco', NotaParcial>>; envio?: { envio: ShippingItem | null; tipo: string | null; precoCents: number } | null; promocoes?: number | null; preco?: number | null; fotos?: number | null; titulo?: number | null; descricao?: number | null }
const ACOES: Partial<Record<Dimensao, string>> = { promocoes: 'Aderir a uma promoção disponível', preco: 'Revisar a posição de preço', fotos: 'Melhorar as fotos', titulo: 'Ajustar o título', descricao: 'Completar a descrição', giro: 'Investigar o giro do item' };
const nota = (d: Dimensao, v: number | null | undefined, evidencia: string): NotaDimensao => {
  if (d === 'promocoes' && v === 0.0001) return { dimensao: d, peso: PESOS[d], nota: 0, evidencia: 'sem promoção atual', acao: ACOES.promocoes! };
  const n = v != null && Number.isFinite(v) && v > 0 ? Math.min(1, v / 100) : null;
  return { dimensao: d, peso: PESOS[d], nota: n, evidencia, acao: n !== null && n < 0.7 ? ACOES[d] ?? null : null };
};
/**
 * Giro relativo: unidades do período sobre a mediana dos itens com venda (mesma janela, cobertura completa).
 * Mediana ou mais = 1; sem venda = 0 (medido). Sem cobertura completa, null.
 */
export function notaGiro(unidades: number | null, mediana: number | null): number | null {
  if (unidades == null || mediana == null || mediana <= 0) return null;
  return Math.min(1, unidades / mediana);
}
export function mediana(vs: number[]): number | null {
  const s = vs.filter(v => v > 0).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function montarDimensoes(c: InsumosConstrucao, giro: number | null): NotaDimensao[] {
  const medida = (d: 'fotos' | 'fichaTecnica' | 'preco', valor?: number | null) => c.medidas?.[d] ? { dimensao: d, peso: PESOS[d], ...c.medidas[d] } : nota(d, valor, 'nota registrada');
  return [
    nota('promocoes', c.promocoes, 'nota registrada'), medida('preco', c.preco), medida('fotos', c.fotos),
    nota('titulo', c.titulo, 'nota registrada'), nota('descricao', c.descricao, 'nota registrada'),
    c.envio ? { dimensao: 'exposicaoComercial', peso: PESOS.exposicaoComercial, ...notarExposicaoComercial(c.envio.envio, c.envio.tipo, c.envio.precoCents) }
      : { dimensao: 'exposicaoComercial', peso: PESOS.exposicaoComercial, nota: null, evidencia: 'não medido', acao: null },
    medida('fichaTecnica'),
    { dimensao: 'experiencia', peso: PESOS.experiencia, nota: null, evidencia: 'não medido', acao: null },
    { dimensao: 'conversao', peso: PESOS.conversao, nota: null, evidencia: 'não medido', acao: null },
    { dimensao: 'visitasRelativas', peso: PESOS.visitasRelativas, nota: null, evidencia: 'não medido', acao: null },
    { dimensao: 'giro', peso: PESOS.giro, nota: giro, evidencia: 'unidades vs mediana da loja', acao: giro !== null && giro < 0.5 ? ACOES.giro! : null },
  ];
}

/** Participação atual em promoções (catálogo lido por completo): participa = 100; não participa = medido como zero. */
export const SEM_PROMOCAO = 0.0001;
