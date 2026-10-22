// Estudo de mercado a partir de um anúncio: leitura das respostas do ML, estatística e sinais. Sem I/O.
// Não há volume de busca nem vendas de concorrentes na API; nada aqui estima esses números.

/** Regras fixas dos sinais. Os números são do painel (o ML não publica faixas para isso). */
export const LIMIARES_MERCADO = {
  /** Vendedores concorrentes distintos: até `poucos` é verde, acima de `muitos` é vermelho. */
  vendedoresPoucos: 5,
  vendedoresMuitos: 20,
  /** Fração das ofertas concorrentes com Full / frete grátis a partir da qual quem não tem fica em vermelho. */
  fullMuito: 0.5,
  freteMuito: 0.5,
  /** Fração de ofertas de lojas oficiais a partir da qual o sinal fica vermelho. */
  lojaOficialMuita: 0.3,
  /** Abaixo disso não há leitura de preço por quartis. */
  ofertasMinimas: 3,
};

export const LIMITES_COLETA = {
  produtos: 3,
  ofertasPorProduto: 200,
  ofertasGuardadas: 100,
  destaquesComNome: 10,
};

const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];

// ── Estatística ─────────────────────────────────────────────────────────────

export type Quartis = { n: number; min: number; q1: number; mediana: number; q3: number; max: number };

/** Quartis por interpolação linear (mesmo método do Excel QUARTIL.INC). */
export function quartis(valores: number[]): Quartis | null {
  const s = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const q = (p: number) => {
    const pos = (s.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  };
  const r = (v: number) => Math.round(v * 100) / 100;
  return { n: s.length, min: s[0], q1: r(q(0.25)), mediana: r(q(0.5)), q3: r(q(0.75)), max: s[s.length - 1] };
}

// ── Palavras ────────────────────────────────────────────────────────────────

const PARADAS = new Set(["com", "para", "por", "das", "dos", "sem", "uma", "um", "the", "and"]);

export function palavras(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PARADAS.has(p));
}

// ── Tendências (/trends/{site} e /trends/{site}/{categoria}) ─────────────────

export type GrupoTendencia = "crescimento" | "desejadas" | "populares";
export type Tendencia = { posicao: number; palavra: string; url: string | null; grupo: GrupoTendencia; no_titulo: boolean; relacionada: boolean };

/** O ML devolve 50 termos na ordem: 10 de maior crescimento, 20 mais desejados, 20 mais populares. */
export function grupoDaPosicao(posicao: number): GrupoTendencia {
  if (posicao <= 10) return "crescimento";
  if (posicao <= 30) return "desejadas";
  return "populares";
}

export function lerTendencias(json: unknown, tituloAnuncio: string): Tendencia[] {
  const doTitulo = new Set(palavras(tituloAnuncio));
  return arr(json).flatMap((t, i) => {
    const palavra = txt(t.keyword);
    if (!palavra) return [];
    const termos = palavras(palavra);
    return [{
      posicao: i + 1,
      palavra,
      url: txt(t.url),
      grupo: grupoDaPosicao(i + 1),
      no_titulo: termos.length > 0 && termos.every((p) => doTitulo.has(p)),
      relacionada: termos.some((p) => p.length >= 4 && doTitulo.has(p)),
    }];
  });
}

// ── Mais vendidos (/highlights) ─────────────────────────────────────────────

export type Destaque = { posicao: number; id: string; tipo: string; nome: string | null; preco: number | null; seu: boolean };

export function lerDestaques(json: unknown): Destaque[] {
  const c = json && typeof json === "object" ? (json as { content?: unknown }).content : null;
  return arr(c).flatMap((d) => {
    const id = txt(d.id), posicao = num(d.position);
    return id && posicao != null ? [{ posicao, id, tipo: txt(d.type) ?? "ITEM", nome: null, preco: null, seu: false }] : [];
  }).sort((a, b) => a.posicao - b.posicao);
}

/** /highlights/{site}/item/{id} e /product/{id}: posição quando está entre os 20 mais vendidos. */
export function lerPosicao(json: unknown): number | null {
  return json && typeof json === "object" ? num((json as { position?: unknown }).position) : null;
}

// ── Ofertas do catálogo (/products/{id}/items) ──────────────────────────────

export type Oferta = {
  item_id: string;
  produto_id: string;
  seller_id: number | null;
  preco: number;
  preco_original: number | null;
  condicao: string | null;
  tipo_anuncio: string | null;
  logistica: string | null;
  full: boolean;
  frete_gratis: boolean;
  loja_oficial: boolean;
};

export function lerOfertas(json: unknown, produtoId: string): { ofertas: Oferta[]; total: number | null } {
  const j = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const ofertas = arr(j.results).flatMap((o) => {
    const id = txt(o.item_id), preco = num(o.price);
    if (!id || preco == null) return [];
    const envio = (o.shipping ?? {}) as Record<string, unknown>;
    const logistica = txt(envio.logistic_type);
    return [{
      item_id: id,
      produto_id: produtoId,
      seller_id: num(o.seller_id),
      preco,
      preco_original: num(o.original_price),
      condicao: txt(o.condition),
      tipo_anuncio: txt(o.listing_type_id),
      logistica,
      full: logistica === "fulfillment",
      frete_gratis: envio.free_shipping === true,
      loja_oficial: o.official_store_id != null,
    }];
  });
  return { ofertas, total: num((j.paging as Record<string, unknown> | undefined)?.total) };
}

export type Concorrencia = {
  ofertas: number;
  vendedores: number;
  precos: Quartis | null;
  full: number | null;
  frete_gratis: number | null;
  lojas_oficiais: number | null;
  novos: number | null;
};

/** Resumo das ofertas dos concorrentes (as do próprio vendedor ficam de fora). */
export function resumirConcorrencia(ofertas: Oferta[], meuSellerId: number): Concorrencia {
  const deles = ofertas.filter((o) => o.seller_id !== meuSellerId);
  const n = deles.length;
  const fracao = (f: (o: Oferta) => boolean) => (n ? Math.round((deles.filter(f).length / n) * 1000) / 1000 : null);
  return {
    ofertas: n,
    vendedores: new Set(deles.map((o) => o.seller_id ?? o.item_id)).size,
    precos: quartis(deles.map((o) => o.preco)),
    full: fracao((o) => o.full),
    frete_gratis: fracao((o) => o.frete_gratis),
    lojas_oficiais: fracao((o) => o.loja_oficial),
    novos: fracao((o) => o.condicao === "new"),
  };
}

// ── Competição no catálogo (/items/{id}/price_to_win) ───────────────────────

export type Competicao = {
  status: string | null;
  preco_atual: number | null;
  preco_para_ganhar: number | null;
  visibilidade: string | null;
  dividem_primeiro: number | null;
  motivos: string[];
  oportunidades: string[];
  vencedor: { item_id: string | null; preco: number | null } | null;
};

export function lerCompeticao(json: unknown): Competicao | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const v = j.winner && typeof j.winner === "object" ? j.winner as Record<string, unknown> : null;
  return {
    status: txt(j.status),
    preco_atual: num(j.current_price),
    preco_para_ganhar: num(j.price_to_win),
    visibilidade: txt(j.visit_share),
    dividem_primeiro: num(j.competitors_sharing_first_place),
    motivos: (Array.isArray(j.reason) ? j.reason : []).filter((r): r is string => typeof r === "string"),
    oportunidades: arr(j.boosts).filter((b) => b.status === "opportunity").flatMap((b) => txt(b.id) ? [txt(b.id)!] : []),
    vencedor: v ? { item_id: txt(v.item_id), preco: num(v.price) } : null,
  };
}

// ── Tarifa de venda (/sites/{site}/listing_prices) ──────────────────────────

export type Tarifa = { valor: number; percentual: number | null; fixa: number | null };

/** A resposta vem como objeto ou lista (às vezes lista de listas); usa o primeiro com sale_fee_amount. */
export function lerTarifa(json: unknown, tipoAnuncio?: string | null): Tarifa | null {
  const todos: Record<string, unknown>[] = [];
  const juntar = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === "object") todos.push(v as Record<string, unknown>);
  };
  juntar(json);
  const comTarifa = todos.filter((t) => num(t.sale_fee_amount) != null);
  const t = comTarifa.find((x) => !tipoAnuncio || x.listing_type_id === tipoAnuncio) ?? (tipoAnuncio ? null : comTarifa[0]);
  if (!t) return null;
  const d = (t.sale_fee_details ?? {}) as Record<string, unknown>;
  return { valor: num(t.sale_fee_amount)!, percentual: num(d.percentage_fee), fixa: num(d.fixed_fee) };
}

// ── Margem ──────────────────────────────────────────────────────────────────

export type Margem = { preco: number; tarifa: number; custo: number; frete: number; valor: number; percentual: number };

/** Preço − tarifa do ML (já inclui a taxa fixa) − custo do produto − frete pago pelo vendedor. */
export function calcularMargem(preco: number, tarifa: number, custo: number, frete = 0): Margem {
  const valor = Math.round((preco - tarifa - custo - frete) * 100) / 100;
  return { preco, tarifa, custo, frete, valor, percentual: preco > 0 ? Math.round((valor / preco) * 1000) / 1000 : 0 };
}

// ── Sinais ──────────────────────────────────────────────────────────────────

export type Sinal = "verde" | "amarelo" | "vermelho" | "sem_dado";
export type Fator = { id: string; nome: string; sinal: Sinal; medido: string; regra: string };

export type EntradaFatores = {
  produtosEncontrados: number;
  concorrencia: Concorrencia;
  meu: { preco: number | null; full: boolean; frete_gratis: boolean; loja_oficial: boolean; catalogo: boolean };
  competicao: Competicao | null;
  destaques: { categoriaTem: boolean; minhaPosicao: number | null; produtoPosicao: number | null };
  tendenciasRelacionadas: number;
  tendenciasTotal: number;
  margem: Margem | null;
  margemMinima: number | null;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const reais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function avaliarFatores(e: EntradaFatores): Fator[] {
  const L = LIMIARES_MERCADO;
  const c = e.concorrencia;
  const fatores: Fator[] = [];
  const semCatalogo = e.produtosEncontrados === 0;

  fatores.push({
    id: "concorrencia",
    nome: "Concorrência",
    ...(semCatalogo
      ? { sinal: "sem_dado" as Sinal, medido: "Nenhum produto de catálogo encontrado para comparar." }
      : {
        sinal: (c.vendedores <= L.vendedoresPoucos ? "verde" : c.vendedores <= L.vendedoresMuitos ? "amarelo" : "vermelho") as Sinal,
        medido: `${c.vendedores} vendedor(es) concorrente(s) em ${c.ofertas} oferta(s).`,
      }),
    regra: `Verde até ${L.vendedoresPoucos} vendedores; vermelho acima de ${L.vendedoresMuitos}.`,
  });

  const p = c.precos;
  fatores.push({
    id: "preco",
    nome: "Preço",
    ...(!p || p.n < L.ofertasMinimas || e.meu.preco == null
      ? { sinal: "sem_dado" as Sinal, medido: `Menos de ${L.ofertasMinimas} ofertas concorrentes para comparar o preço.` }
      : {
        sinal: (e.meu.preco <= p.mediana ? "verde" : e.meu.preco <= p.q3 ? "amarelo" : "vermelho") as Sinal,
        medido: `Seu preço ${reais(e.meu.preco)}; mediana dos concorrentes ${reais(p.mediana)} (faixa do meio ${reais(p.q1)} a ${reais(p.q3)}).`,
      }),
    regra: "Verde até a mediana; amarelo até o 3º quartil; vermelho acima dele.",
  });

  const comparativo = (id: string, nome: string, meu: boolean, fracao: number | null, limite: number): Fator => ({
    id,
    nome,
    ...(fracao == null
      ? { sinal: "sem_dado" as Sinal, medido: "Sem ofertas concorrentes para comparar." }
      : {
        sinal: (meu || fracao === 0 ? "verde" : fracao >= limite ? "vermelho" : "amarelo") as Sinal,
        medido: `${meu ? "Você tem" : "Você não tem"}; ${pct(fracao)} dos concorrentes têm.`,
      }),
    regra: `Verde se você tem ou nenhum concorrente tem; vermelho se você não tem e ${pct(limite)} ou mais têm.`,
  });
  fatores.push(comparativo("full", "Full", e.meu.full, c.full, L.fullMuito));
  fatores.push(comparativo("frete", "Frete grátis", e.meu.frete_gratis, c.frete_gratis, L.freteMuito));

  fatores.push({
    id: "lojas_oficiais",
    nome: "Lojas oficiais",
    ...(c.lojas_oficiais == null
      ? { sinal: "sem_dado" as Sinal, medido: "Sem ofertas concorrentes para comparar." }
      : {
        sinal: (e.meu.loja_oficial || c.lojas_oficiais === 0 ? "verde" : c.lojas_oficiais >= L.lojaOficialMuita ? "vermelho" : "amarelo") as Sinal,
        medido: `${pct(c.lojas_oficiais)} das ofertas concorrentes são de lojas oficiais${e.meu.loja_oficial ? "; você também é" : ""}.`,
      }),
    regra: `Verde sem lojas oficiais concorrendo; vermelho com ${pct(L.lojaOficialMuita)} ou mais.`,
  });

  const cp = e.competicao;
  const statusCatalogo: Record<string, { sinal: Sinal; texto: string }> = {
    winning: { sinal: "verde", texto: "Você está ganhando a página do produto." },
    sharing_first_place: { sinal: "amarelo", texto: "Você divide o primeiro lugar." },
    competing: { sinal: "vermelho", texto: "Você está perdendo a página do produto." },
    listed: { sinal: "vermelho", texto: "Você só aparece na lista, sem competir." },
  };
  const sc = cp?.status ? statusCatalogo[cp.status] : null;
  fatores.push({
    id: "catalogo",
    nome: "Competição no catálogo",
    ...(!e.meu.catalogo
      ? { sinal: "sem_dado" as Sinal, medido: "Anúncio fora do catálogo." }
      : sc
        ? { sinal: sc.sinal, medido: `${sc.texto}${cp?.preco_para_ganhar != null ? ` Preço para ganhar: ${reais(cp.preco_para_ganhar)}.` : ""}` }
        : { sinal: "sem_dado" as Sinal, medido: "O Mercado Livre não informou a posição no catálogo." }),
    regra: "Status do Mercado Livre: ganhando é verde; dividindo é amarelo; perdendo ou só listado é vermelho.",
  });

  const d = e.destaques;
  const posicao = d.minhaPosicao ?? d.produtoPosicao;
  fatores.push({
    id: "mais_vendidos",
    nome: "Mais vendidos da categoria",
    ...(posicao != null
      ? { sinal: "verde" as Sinal, medido: `${d.minhaPosicao != null ? "Seu anúncio" : "O produto"} está em ${posicao}º entre os mais vendidos.` }
      : d.categoriaTem
        ? { sinal: "amarelo" as Sinal, medido: "Fora dos 20 mais vendidos da categoria." }
        : { sinal: "sem_dado" as Sinal, medido: "O Mercado Livre não tem lista de mais vendidos para esta categoria." }),
    regra: "Verde se o anúncio ou o produto está entre os 20 mais vendidos; amarelo se está fora.",
  });

  fatores.push({
    id: "tendencias",
    nome: "Termos em alta",
    ...(e.tendenciasTotal === 0
      ? { sinal: "sem_dado" as Sinal, medido: "Sem termos em alta para a categoria nesta semana." }
      : {
        sinal: (e.tendenciasRelacionadas > 0 ? "verde" : "amarelo") as Sinal,
        medido: `${e.tendenciasRelacionadas} de ${e.tendenciasTotal} termos em alta da categoria têm palavras do seu título.`,
      }),
    regra: "Verde se algum termo em alta da categoria tem palavra do título; amarelo se nenhum tem.",
  });

  if (e.margem) {
    const m = e.margem;
    const min = e.margemMinima;
    fatores.push({
      id: "margem",
      nome: "Margem no seu preço",
      sinal: m.valor < 0 ? "vermelho" : min != null && m.percentual < min ? "amarelo" : "verde",
      medido: `${reais(m.valor)} por unidade (${pct(m.percentual)} do preço).`,
      regra: min != null
        ? `Vermelho se negativa; amarelo abaixo da margem mínima da conta (${pct(min)}).`
        : "Vermelho se negativa. Defina a margem mínima da conta para um sinal mais exigente.",
    });
  }
  return fatores;
}

export const contarSinais = (fatores: Fator[]) => ({
  verdes: fatores.filter((f) => f.sinal === "verde").length,
  amarelos: fatores.filter((f) => f.sinal === "amarelo").length,
  vermelhos: fatores.filter((f) => f.sinal === "vermelho").length,
});

// ── IA ──────────────────────────────────────────────────────────────────────

export const SCHEMA_PARECER = {
  type: "object",
  additionalProperties: false,
  required: ["parecer", "pontos_fortes", "riscos", "proximos_passos"],
  properties: {
    parecer: { type: "string" },
    pontos_fortes: { type: "array", items: { type: "string" } },
    riscos: { type: "array", items: { type: "string" } },
    proximos_passos: { type: "array", items: { type: "string" } },
  },
};

export type Parecer = { parecer: string; pontos_fortes: string[]; riscos: string[]; proximos_passos: string[] };

export function montarPromptMercado(fatos: Record<string, unknown>): string {
  return [
    "Você é consultor de vendas no Mercado Livre Brasil. Escreva um parecer de viabilidade para o anúncio abaixo.",
    "Regras:",
    "- Use só os números dos FATOS. Cite os números ao justificar.",
    "- Não invente volume de busca, vendas de concorrentes, nota única ou probabilidade.",
    "- Se um dado faltar, diga que falta em vez de supor.",
    "- Os sinais (verde, amarelo, vermelho) já foram calculados por regras fixas; explique-os, não os altere.",
    "- parecer: 3 a 5 frases. pontos_fortes, riscos e proximos_passos: até 5 itens curtos cada, em português do Brasil.",
    "",
    "FATOS:",
    JSON.stringify(fatos),
  ].join("\n");
}

export function validarParecer(json: unknown): Parecer | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const lista = (v: unknown) => (Array.isArray(v) ? v : []).filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim()).slice(0, 5);
  const parecer = txt(j.parecer);
  if (!parecer) return null;
  return { parecer, pontos_fortes: lista(j.pontos_fortes), riscos: lista(j.riscos), proximos_passos: lista(j.proximos_passos) };
}
