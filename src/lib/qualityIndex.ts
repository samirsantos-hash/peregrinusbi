/**
 * Quality Index (SCORE_FINAL_BBF) — base de cálculo e decomposição.
 *
 * SCORE_FINAL_BBF = (SCORE_CARACTERISTICA_FINAL + SCORE_OFERTA_FINAL + SCORE_QUALIDADE_FINAL) / 3
 *  - CARACTERISTICA = média de 8 itens  -> peso de cada item = (1/8) x (1/3) = 4,1667 pts
 *  - OFERTA         = média de 10 itens -> peso de cada item = (1/10) x (1/3) = 3,3333 pts
 *  - QUALIDADE      = 1 item (itens verdes) -> peso = (1/1) x (1/3) = 33,3333 pts
 *
 * A coluna score_final_bbf só existe em cpp_mensal/cart_cpp_mensal (hoje vazias).
 * Na base servida ao painel (sellers_kpi / sellers_kpi_daily) existem apenas os três
 * blocos, então o BBF é reconstruído a partir deles e reconciliado quando a coluna
 * de origem estiver disponível (ver reconciliarBbf).
 */

export type BlocoQualidade = "caracteristica" | "oferta" | "qualidade";

export interface ItemQualidade {
  /** constante original da fonte (não exibir na UI) */
  constante: string;
  /** nome em português exibido no drawer */
  nome: string;
  bloco: BlocoQualidade;
  /** campo disponível na camada de KPIs do painel (quando existir na base) */
  campo?: string;
}

export const PESO_BLOCO: Record<BlocoQualidade, number> = {
  caracteristica: 100 / 8 / 3, // 4,1667
  oferta: 100 / 10 / 3, // 3,3333
  qualidade: 100 / 1 / 3, // 33,3333
};

export const ITENS_QUALIDADE: ItemQualidade[] = [
  // CARACTERÍSTICA (8)
  { constante: "PONTUACAO_LL_CHARACTERISTICS_PICTURES", nome: "Fotos", bloco: "caracteristica", campo: "llPicturesScore" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_TITLE", nome: "Título", bloco: "caracteristica", campo: "llTitleScore" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_TECHNICAL_SPECIFICATIONS_MAIN", nome: "Ficha técnica principal", bloco: "caracteristica", campo: "llTechSpecsScore" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_GTIN", nome: "Código GTIN", bloco: "caracteristica", campo: "pontuacaoLlGtin" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_SHORTS", nome: "Vídeos curtos", bloco: "caracteristica" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_FISCAL_DATA", nome: "Dados fiscais", bloco: "caracteristica" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_DESCRIPTION", nome: "Descrição", bloco: "caracteristica", campo: "llDescriptionScore" },
  { constante: "PONTUACAO_LL_CHARACTERISTICS_CATALOG", nome: "Vínculo ao catálogo", bloco: "caracteristica" },
  // OFERTA (10)
  { constante: "PONTUACAO_LL_OFFER_STOCK_AVAILABILITY_TIME", nome: "Disponibilidade de estoque", bloco: "oferta", campo: "llStockAvailabilityScore" },
  { constante: "PONTUACAO_LL_OFFER_FINANCING", nome: "Parcelamento", bloco: "oferta" },
  { constante: "PONTUACAO_LL_OFFER_ME", nome: "Mercado Envios", bloco: "oferta" },
  { constante: "PONTUACAO_LL_OFFER_PROMOTIONS", nome: "Promoções", bloco: "oferta", campo: "llPromotionsScore" },
  { constante: "PONTUACAO_LL_OFFER_FREE_SHIPPING", nome: "Frete grátis", bloco: "oferta", campo: "llFreeShippingScore" },
  { constante: "PONTUACAO_LL_OFFER_STOCK_DEPOSITO", nome: "Estoque em depósito", bloco: "oferta" },
  { constante: "PONTUACAO_LL_OFFER_ME_FULL_FARMING", nome: "Adesão ao FULL", bloco: "oferta" },
  { constante: "PONTUACAO_LL_OFFER_ME_FLEX_ITEM_OPTIN", nome: "Adesão ao Flex", bloco: "oferta" },
  { constante: "PONTUACAO_LL_OFFER_PRICE", nome: "Preço", bloco: "oferta", campo: "llPriceScore" },
  { constante: "PONTUACAO_LL_OFFER_ADS", nome: "Publicidade no anúncio", bloco: "oferta", campo: "llAdsScore" },
  // QUALIDADE (1)
  { constante: "PONTUACAO_LL_QUALITY_ITENS_VERDE_OK_SCORE", nome: "Itens em qualidade verde", bloco: "qualidade", campo: "scoreQualidade" },
];

export interface ItemDecomposto extends ItemQualidade {
  valor: number | null;
  peso: number;
  /** ganho em pontos do índice final se o item for a 100 */
  ganho: number | null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Score BBF a partir dos três blocos. Não aplica clamp. */
export function calcularBbf(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  const c = num(row.scoreCaracteristica ?? row.score_caracteristica_final);
  const o = num(row.scoreOferta ?? row.score_oferta_final);
  const q = num(row.scoreQualidade ?? row.score_qualidade_final);
  const partes = [c, o, q];
  if (partes.every((p) => p == null || p === 0)) return null;
  return ((c ?? 0) + (o ?? 0) + (q ?? 0)) / 3;
}

/**
 * Reconcilia o BBF recalculado com a coluna da fonte, quando ela existir.
 * Nunca substitui a fonte silenciosamente: devolve a divergência para exibição.
 */
export function reconciliarBbf(
  row: Record<string, unknown> | null | undefined,
): { valor: number | null; origem: "fonte" | "recalculado"; divergencia: number | null } {
  const fonte = num(row?.scoreFinalBbf ?? row?.score_final_bbf);
  const recalc = calcularBbf(row);
  if (fonte != null) {
    return {
      valor: fonte,
      origem: "fonte",
      divergencia: recalc != null ? Math.abs(fonte - recalc) : null,
    };
  }
  return { valor: recalc, origem: "recalculado", divergencia: null };
}

/** Decompõe os 19 itens, com ganho possível em pontos do índice. Item nulo não gera ganho. */
export function decomporQualidade(row: Record<string, unknown> | null | undefined): ItemDecomposto[] {
  return ITENS_QUALIDADE.map((item) => {
    const peso = PESO_BLOCO[item.bloco];
    const bruto = item.campo ? num(row?.[item.campo]) : null;
    // 0 na base agregada significa "não medido" para estes scores.
    const valor = bruto != null && bruto > 0 ? bruto : null;
    const ganho = valor != null ? ((100 - valor) * peso) / 100 : null;
    return { ...item, valor, peso, ganho };
  }).sort((a, b) => (b.ganho ?? -1) - (a.ganho ?? -1));
}

/** Percentil (0–100) de um valor dentro de uma distribuição. */
export interface PontoBbf {
  data: string;
  valor: number;
}

/**
 * Série do SCORE_FINAL_BBF por data: agrega os três blocos (média das linhas com dado)
 * e reconstrói o índice. Datas sem nenhum bloco medido são omitidas (sem interpolar).
 */
export function serieBbf(rows: Array<Record<string, unknown>> | null | undefined): PontoBbf[] {
  const porData = new Map<string, Array<Record<string, unknown>>>();
  for (const r of rows || []) {
    const d = String((r as any)?.date ?? "");
    if (!d) continue;
    const arr = porData.get(d);
    if (arr) arr.push(r);
    else porData.set(d, [r]);
  }
  const media = (base: Array<Record<string, unknown>>, campo: string) => {
    const validos = base.map((b) => Number((b as any)[campo])).filter((v) => Number.isFinite(v) && v > 0);
    if (!validos.length) return null;
    return validos.reduce((s, v) => s + v, 0) / validos.length;
  };
  return [...porData.entries()]
    .map(([data, base]) => {
      const valor = calcularBbf({
        scoreCaracteristica: media(base, "scoreCaracteristica"),
        scoreOferta: media(base, "scoreOferta"),
        scoreQualidade: media(base, "scoreQualidade"),
        scoreFinalBbf: media(base, "scoreFinalBbf"),
      } as Record<string, unknown>);
      const fonte = media(base, "scoreFinalBbf");
      const final = fonte ?? valor;
      return final != null ? { data, valor: final } : null;
    })
    .filter((p): p is PontoBbf => p !== null)
    .sort((a, b) => a.data.localeCompare(b.data));
}

export function percentilNaCarteira(valor: number, distribuicao: number[]): number | null {
  const validos = distribuicao.filter((v) => Number.isFinite(v));
  if (validos.length < 10) return null; // base insuficiente
  const abaixo = validos.filter((v) => v < valor).length;
  const iguais = validos.filter((v) => v === valor).length;
  return Math.round(((abaixo + iguais / 2) / validos.length) * 100);
}

export const TEXTO_AJUDA_QUALITY =
  "O Quality Index é a média de três blocos com peso igual: Característica (conteúdo do anúncio), " +
  "Oferta (condições de venda) e Qualidade (itens em verde). Cada bloco vale um terço. " +
  "Como Qualidade tem um único item e Característica tem oito, corrigir 'itens verdes' vale oito vezes " +
  "mais que corrigir uma foto. Clique no card para ver o ganho em pontos de cada correção.";

export const DESTAQUE_ITENS_VERDES =
  "Itens verdes pesa 33% do índice — o mesmo que os 8 itens de conteúdo somados. É a maior alavanca isolada.";
