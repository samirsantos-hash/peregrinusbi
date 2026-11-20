// Dimensões do diagnóstico v2. Funções puras; nota nula = não medida, nunca zero.
export interface NotaParcial { nota: number | null; evidencia: string; acao: string | null }

export interface ShippingItem { mode?: string; free_shipping: boolean; logistic_type: string | null; tags?: string[] }

/** Logística decide; tipo de anúncio ajusta na margem. */
const PESO_LOGISTICA = 0.87;
const PESO_TIPO = 0.13;
const NOTA_LOGISTICA: Record<string, number> = { fulfillment: 1, self_service: 0.75, cross_docking: 0.5, xd_drop_off: 0.45, drop_off: 0.35 };
const NOMES_LOGISTICA: Record<string, string> = { fulfillment: 'Full', self_service: 'Flex', cross_docking: 'coleta', drop_off: 'agência', xd_drop_off: 'agência com cross-docking' };
export const CLASSICO = 'gold_special';
export const PREMIUM = 'gold_pro';
/** Limiar provisório do aviso de margem por tipo (R$ 79). */
export const LIMIAR_TIPO_CENTS = 7900;

export function notarExposicaoComercial(s: ShippingItem | null, tipoAnuncio: string | null, precoCents: number, limiarTipoCents = LIMIAR_TIPO_CENTS): NotaParcial {
  const tipoLog = s?.logistic_type ?? null;
  if (!s || !tipoLog) return { nota: null, evidencia: 'modalidade de envio não informada', acao: null };
  const notaLog = NOTA_LOGISTICA[tipoLog] ?? 0.2;
  const notaTipo = tipoAnuncio === PREMIUM ? 1 : tipoAnuncio === CLASSICO ? 0 : null;
  const nota = notaLog * PESO_LOGISTICA + (notaTipo ?? 0) * PESO_TIPO;
  const nomeTipo = tipoAnuncio === PREMIUM ? 'premium' : tipoAnuncio === CLASSICO ? 'clássico' : 'tipo não informado';
  const acoes: string[] = [];
  if (tipoLog !== 'fulfillment') acoes.push(`Migrar para o Full ganha ${((1 - notaLog) * PESO_LOGISTICA * 100).toFixed(0)} pontos nesta dimensão — é o maior salto disponível no anúncio`);
  const tipoEsperado = precoCents > limiarTipoCents ? CLASSICO : PREMIUM;
  if (Number.isFinite(precoCents) && precoCents > 0 && tipoAnuncio && tipoAnuncio !== tipoEsperado) {
    acoes.push(`Preço de ${(precoCents / 100).toFixed(2).replace('.', ',')} pede ${tipoEsperado === CLASSICO ? 'clássico' : 'premium'} pela regra de margem — avaliar o efeito na rentabilidade antes de manter`);
  }
  if (!s.free_shipping && precoCents >= limiarTipoCents) acoes.push('Acima do limiar o comprador espera frete grátis — não oferecer reduz conversão');
  return { nota, evidencia: `${NOMES_LOGISTICA[tipoLog] ?? tipoLog} em anúncio ${nomeTipo}${s.free_shipping ? ', com frete grátis' : ''}`, acao: acoes.length ? acoes.join('. ') + '.' : null };
}

export interface FotoApi { id: string; url?: string; secure_url?: string; size?: string; max_size: string; quality?: string }
export interface MedidaFoto { largura: number; altura: number; altaResolucao: boolean; quadrada: boolean }

/** Usa max_size (original enviado), nunca size (versão servida). */
export function medirFoto(max_size: string): MedidaFoto | null {
  const m = /^(\d+)x(\d+)$/.exec((max_size ?? '').trim());
  if (!m) return null;
  const largura = Number(m[1]), altura = Number(m[2]);
  if (!largura || !altura) return null;
  const r = largura / altura;
  return { largura, altura, altaResolucao: largura >= 1200 && altura >= 1200, quadrada: r >= 0.95 && r <= 1.05 };
}
export const MINIMO_FOTOS = 6;

export function notarFotos(fotos: FotoApi[] | null): NotaParcial {
  if (fotos === null) return { nota: null, evidencia: 'fotos não lidas', acao: null };
  if (!fotos.length) return { nota: 0, evidencia: 'nenhuma foto publicada', acao: `Publicar ao menos ${MINIMO_FOTOS} fotos em 1200x1200 ou mais.` };
  const medidas = fotos.map(f => medirFoto(f.max_size)).filter((x): x is MedidaFoto => x !== null);
  if (!medidas.length) return { nota: null, evidencia: 'fotos sem dimensão informada', acao: null };
  if (medidas.length !== fotos.length) return { nota: null, evidencia: `${medidas.length} de ${fotos.length} fotos com dimensão original confirmada; medição incompleta`, acao: null };
  const n = fotos.length;
  const emAlta = medidas.filter(m => m.altaResolucao).length;
  const quadradas = medidas.filter(m => m.quadrada).length;
  const abaixo = medidas.filter(m => !m.altaResolucao);
  const nota = Math.min(1, n / MINIMO_FOTOS) * 0.5 + (emAlta / medidas.length) * 0.3 + (quadradas / medidas.length) * 0.2;
  const faltas: string[] = [];
  if (n < MINIMO_FOTOS) faltas.push(`publicar mais ${MINIMO_FOTOS - n} fotos`);
  if (abaixo.length) {
    const menor = abaixo.reduce((a, b) => a.largura * a.altura <= b.largura * b.altura ? a : b);
    faltas.push(`reenviar ${abaixo.length} foto${abaixo.length > 1 ? 's' : ''} em 1200x1200 ou mais (a menor está em ${menor.largura}x${menor.altura})`);
  }
  if (quadradas < medidas.length) faltas.push(`ajustar ${medidas.length - quadradas} para proporção quadrada`);
  return { nota, evidencia: `${n} fotos, ${emAlta} em alta resolução, ${quadradas} quadradas`, acao: faltas.length ? faltas.join('; ') : null };
}

export interface AtributoItem { id: string; name: string; value_name: string | null }
export interface AtributoCategoria { id: string; name: string; tags?: Record<string, boolean> }
const preenchido = (a: AtributoItem) => a.value_name !== null && a.value_name.trim() !== '' && !/^(n[ãa]o aplica|n\/a|-|outro)$/i.test(a.value_name.trim());

export function notarFichaTecnica(doItem: AtributoItem[], daCategoria: AtributoCategoria[] | null): NotaParcial {
  if (!daCategoria?.length) return { nota: null, evidencia: 'atributos da categoria não carregados', acao: null };
  const obrig = daCategoria.filter(a => a.tags?.required || a.tags?.catalog_required);
  const mapa = new Map(doItem.map(a => [a.id, a]));
  const ok = obrig.filter(o => { const a = mapa.get(o.id); return !!a && preenchido(a); });
  const faltando = obrig.filter(o => !ok.includes(o));
  const total = daCategoria.filter(a => { const item = mapa.get(a.id); return !!item && preenchido(item); }).length;
  const notaObrig = obrig.length ? ok.length / obrig.length : 1;
  const notaGeral = Math.min(1, total / daCategoria.length);
  return {
    nota: notaObrig * 0.7 + notaGeral * 0.3,
    evidencia: `${ok.length} de ${obrig.length} atributos obrigatórios, ${total} de ${daCategoria.length} no total`,
    acao: faltando.length ? `Preencher: ${faltando.slice(0, 5).map(f => f.name).join(', ')}${faltando.length > 5 ? ` e mais ${faltando.length - 5}` : ''}.` : null,
  };
}

export function notarVisitas(visitasItem: number | null, medianaLoja: number | null): NotaParcial {
  if (visitasItem === null || medianaLoja === null || medianaLoja <= 0) return { nota: null, evidencia: 'sem base de comparação de visitas', acao: null };
  const r = visitasItem / medianaLoja;
  return { nota: Math.max(0, Math.min(1, r / 2)), evidencia: `${visitasItem} visitas contra mediana de ${Math.round(medianaLoja)} da loja`, acao: r < 0.5 ? 'Visitas muito abaixo da mediana — problema de exposição, não de conversão.' : null };
}

export const MINIMO_VISITAS = 50;
export function notarConversao(visitas: number | null, pedidos: number | null, medianaLoja: number | null): NotaParcial {
  if (visitas === null || pedidos === null) return { nota: null, evidencia: 'visitas ou pedidos não apurados', acao: null };
  if (visitas < MINIMO_VISITAS) return { nota: null, evidencia: `${visitas} visitas — abaixo do mínimo de ${MINIMO_VISITAS} para taxa confiável`, acao: null };
  if (medianaLoja === null || medianaLoja <= 0) return { nota: null, evidencia: 'sem mediana de conversão da loja', acao: null };
  const conv = pedidos / visitas, r = conv / medianaLoja;
  return {
    nota: Math.max(0, Math.min(1, r / 2)),
    evidencia: `conversão de ${(conv * 100).toFixed(2)}% contra ${(medianaLoja * 100).toFixed(2)}% da loja`,
    acao: r < 0.8 ? `Converte ${((1 - r) * 100).toFixed(0)}% abaixo da mediana — recebe tráfego e não fecha: revisar preço, fotos e oferta.` : null,
  };
}

export interface ExperienciaItem { vendas: number; reclamacoes: number; atrasos: number; cancelamentos: number }
export const MINIMO_VENDAS = 20;
export function notarExperiencia(e: ExperienciaItem | null): NotaParcial {
  if (!e) return { nota: null, evidencia: 'sem dados de experiência do item', acao: null };
  if (e.vendas < MINIMO_VENDAS) return { nota: null, evidencia: `${e.vendas} vendas — abaixo do mínimo de ${MINIMO_VENDAS} para taxa confiável`, acao: null };
  const rec = e.reclamacoes / e.vendas, atr = e.atrasos / e.vendas, can = e.cancelamentos / e.vendas;
  const nota = (1 - Math.min(1, rec / 0.02)) * 0.45 + (1 - Math.min(1, atr / 0.05)) * 0.35 + (1 - Math.min(1, can / 0.03)) * 0.2;
  const fora: string[] = [];
  if (rec > 0.02) fora.push(`reclamações em ${(rec * 100).toFixed(1)}%`);
  if (atr > 0.05) fora.push(`atrasos em ${(atr * 100).toFixed(1)}%`);
  if (can > 0.03) fora.push(`cancelamentos em ${(can * 100).toFixed(1)}%`);
  return { nota, evidencia: `${e.vendas} vendas · reclamações ${(rec * 100).toFixed(1)}%, atrasos ${(atr * 100).toFixed(1)}%, cancelamentos ${(can * 100).toFixed(1)}%`, acao: fora.length ? `Fora do limite: ${fora.join(', ')}.` : null };
}
