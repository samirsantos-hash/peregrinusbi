// Gestão de Product Ads: validação, estado para conferir antes de escrever, indicadores e alertas.
// Sem I/O e sem imports: a tela de Publicidade usa as mesmas funções.

export const ESTRATEGIAS = ["profitability", "increase", "visibility"] as const;
export type Estrategia = typeof ESTRATEGIAS[number];
export const NOME_ESTRATEGIA: Record<Estrategia, string> = {
  profitability: "Rentabilidade",
  increase: "Crescimento",
  visibility: "Visibilidade",
};
/** Faixa do ROAS alvo aceita pela API desde dezembro de 2025 (substituiu o ACOS alvo). */
export const ROAS_MIN = 1;
export const ROAS_MAX = 35;
export const MAX_GRUPOS_LOTE = 50;
/** O orçamento da campanha é média diária; a cobrança considera 30 dias. */
export const DIAS_MES = 30;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const txt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const centavos = (v: number) => Math.round(v * 100) / 100;

// ── Campanha ────────────────────────────────────────────────────────────────

export type StatusAds = "active" | "paused";
export type DadosCampanha = { name?: string; budget?: number; strategy?: Estrategia; status?: StatusAds; roas_target?: number };

/** Criar exige todos os campos (a API pede); editar exige ao menos um. */
export function lerDadosCampanha(bruto: unknown, criar: boolean): { ok: true; dados: DadosCampanha } | { ok: false; erro: string } {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const dados: DadosCampanha = {};
  if (b.name !== undefined) {
    const nome = txt(b.name);
    if (!nome) return { ok: false, erro: "Informe o nome da campanha." };
    dados.name = nome;
  }
  if (b.budget !== undefined) {
    const v = num(b.budget);
    if (v == null || v <= 0) return { ok: false, erro: "O orçamento diário deve ser maior que zero." };
    dados.budget = centavos(v);
  }
  if (b.strategy !== undefined) {
    if (!ESTRATEGIAS.includes(b.strategy as Estrategia)) return { ok: false, erro: "Estratégia deve ser rentabilidade, crescimento ou visibilidade." };
    dados.strategy = b.strategy as Estrategia;
  }
  if (b.status !== undefined) {
    if (b.status !== "active" && b.status !== "paused") return { ok: false, erro: "Status deve ser ativa ou pausada." };
    dados.status = b.status;
  }
  if (b.roas_target !== undefined) {
    const v = num(b.roas_target);
    if (v == null || v < ROAS_MIN || v > ROAS_MAX) return { ok: false, erro: `O ROAS alvo deve ficar entre ${ROAS_MIN}× e ${ROAS_MAX}×.` };
    dados.roas_target = Math.round(v * 100) / 100;
  }
  const faltam = (["name", "budget", "strategy", "status", "roas_target"] as const).filter((k) => dados[k] === undefined);
  if (criar && faltam.length) return { ok: false, erro: "Para criar, informe nome, orçamento diário, estratégia, status e ROAS alvo." };
  if (!criar && faltam.length === 5) return { ok: false, erro: "Nada para alterar." };
  return { ok: true, dados };
}

export type CampanhaMl = { id: number; name: string | null; status: StatusAds | null; budget: number | null; strategy: Estrategia | null; roas_target: number | null };

export function lerCampanhaMl(json: unknown): CampanhaMl | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const id = num(j.id) ?? num(j.campaign_id);
  if (id == null) return null;
  const status = txt(j.status)?.toLowerCase();
  const estrategia = txt(j.strategy)?.toLowerCase();
  return {
    id,
    name: txt(j.name),
    status: status === "active" || status === "paused" ? status : null,
    budget: num(j.budget) ?? num(j.daily_budget),
    strategy: ESTRATEGIAS.includes(estrategia as Estrategia) ? estrategia as Estrategia : null,
    roas_target: num(j.roas_target),
  };
}

/** Só os campos que mudam; a API pede ao menos um no PUT. */
export function mudancasCampanha(atual: CampanhaMl, dados: DadosCampanha): DadosCampanha {
  const m: DadosCampanha = {};
  if (dados.name !== undefined && dados.name !== atual.name) m.name = dados.name;
  if (dados.budget !== undefined && dados.budget !== atual.budget) m.budget = dados.budget;
  if (dados.strategy !== undefined && dados.strategy !== atual.strategy) m.strategy = dados.strategy;
  if (dados.status !== undefined && dados.status !== atual.status) m.status = dados.status;
  if (dados.roas_target !== undefined && dados.roas_target !== atual.roas_target) m.roas_target = dados.roas_target;
  return m;
}

export const estadoCampanha = (c: CampanhaMl) => [c.name, c.status, c.budget, c.strategy, c.roas_target].join("|");

const reais = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function textoCampanha(c: DadosCampanha | CampanhaMl): string {
  return [
    c.name ?? null,
    c.budget != null ? `${reais(c.budget)}/dia` : null,
    c.roas_target != null ? `ROAS alvo ${String(c.roas_target).replace(".", ",")}×` : null,
    c.strategy ? NOME_ESTRATEGIA[c.strategy] : null,
    c.status ? (c.status === "active" ? "Ativa" : "Pausada") : null,
  ].filter(Boolean).join(" · ");
}

// ── Ad Group (anúncio na campanha) ──────────────────────────────────────────

export type GrupoMl = { id: number; campaign_id: number | null; status: StatusAds | null; titulo: string | null; tipo: string | null; external_id: string | null };

export function lerGrupoMl(json: unknown): GrupoMl | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const id = num(j.id) ?? num(j.ad_group_id);
  if (id == null) return null;
  const status = txt(j.status)?.toLowerCase();
  return {
    id,
    campaign_id: num(j.campaign_id) || null,
    status: status === "active" || status === "paused" ? status : null,
    titulo: txt(j.title),
    tipo: txt(j.ad_group_type),
    external_id: txt(j.ad_group_external_id),
  };
}

export const estadoGrupo = (g: GrupoMl) => `${g.campaign_id ?? "-"}|${g.status ?? "-"}`;

// ── Indicadores (sempre a partir de somas, nunca média de razões) ───────────

export type LinhaMetrica = { cost: number | null; total_amount: number | null; clicks: number | null; prints: number | null; units_quantity: number | null };
export type Somas = { custo: number; receita: number; cliques: number; impressoes: number; unidades: number; dias: number };

export function somar(linhas: LinhaMetrica[]): Somas {
  const s: Somas = { custo: 0, receita: 0, cliques: 0, impressoes: 0, unidades: 0, dias: linhas.length };
  for (const l of linhas) {
    s.custo += l.cost ?? 0;
    s.receita += l.total_amount ?? 0;
    s.cliques += l.clicks ?? 0;
    s.impressoes += l.prints ?? 0;
    s.unidades += l.units_quantity ?? 0;
  }
  s.custo = centavos(s.custo);
  s.receita = centavos(s.receita);
  return s;
}

export type Indicadores = {
  investimento: number;
  receita: number;
  roas: number | null;
  acos: number | null;
  ctr: number | null;
  cpc: number | null;
  cvr: number | null;
  tacos: number | null;
};

const razao = (a: number, b: number) => (b > 0 ? a / b : null);

/** ACOS, CTR, CVR e TACOS como fração (0,1 = 10%); ROAS em vezes. */
export function indicadores(s: Somas, faturamento: number | null = null): Indicadores {
  return {
    investimento: s.custo,
    receita: s.receita,
    roas: razao(s.receita, s.custo),
    acos: razao(s.custo, s.receita),
    ctr: razao(s.cliques, s.impressoes),
    cpc: razao(s.custo, s.cliques),
    cvr: razao(s.unidades, s.cliques),
    tacos: faturamento != null ? razao(s.custo, faturamento) : null,
  };
}

export type Limites = {
  meta_investimento_ads: number;
  alerta_acos: number;
  alerta_roas: number;
  alerta_ctr: number;
  alerta_cpc: number;
  alerta_tacos: number;
};

/** Padrões da ml_settings quando a conta ainda não tem linha. */
export const LIMITES_PADRAO: Limites = {
  meta_investimento_ads: 0.03,
  alerta_acos: 0.1,
  alerta_roas: 5,
  alerta_ctr: 0.001,
  alerta_cpc: 3.5,
  alerta_tacos: 0.05,
};

export function lerLimites(linha: Record<string, unknown> | null | undefined): Limites {
  const l = { ...LIMITES_PADRAO };
  for (const k of Object.keys(l) as (keyof Limites)[]) {
    const v = linha?.[k];
    const n = typeof v === "string" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) l[k] = n;
  }
  return l;
}

const pct = (v: number, casas = 1) => `${(v * 100).toFixed(casas).replace(".", ",")}%`;
const vezes = (v: number) => `${v.toFixed(1).replace(".", ",")}×`;

/** Alertas de desempenho dos últimos 30 dias pelos limites da conta. Sem investimento, nada a alertar. */
export function alertasDesempenho(ind: Indicadores, l: Limites): string[] {
  if (ind.investimento <= 0) return [];
  const a: string[] = [];
  if (ind.acos != null && ind.acos > l.alerta_acos) a.push(`ACOS ${pct(ind.acos)} acima de ${pct(l.alerta_acos)}`);
  if (ind.receita === 0) a.push("Investimento sem receita atribuída");
  else if (ind.roas != null && ind.roas < l.alerta_roas) a.push(`ROAS ${vezes(ind.roas)} abaixo de ${vezes(l.alerta_roas)}`);
  if (ind.ctr != null && ind.ctr < l.alerta_ctr) a.push(`CTR ${pct(ind.ctr, 2)} abaixo de ${pct(l.alerta_ctr, 2)}`);
  if (ind.cpc != null && ind.cpc > l.alerta_cpc) a.push(`CPC ${reais(ind.cpc)} acima de ${reais(l.alerta_cpc)}`);
  if (ind.tacos != null && ind.tacos > l.alerta_tacos) a.push(`TACOS ${pct(ind.tacos)} acima de ${pct(l.alerta_tacos)}`);
  return a;
}

/** Orçamento mensal projetado (soma dos diários ativos × 30) contra a meta sobre o faturamento de 30 dias. */
export function alertaOrcamento(orcamentosAtivos: number, faturamento30d: number | null, meta: number): string | null {
  const mensal = centavos(orcamentosAtivos * DIAS_MES);
  if (faturamento30d == null) return "Sem faturamento de 30 dias do Mercado Livre para comparar com a meta de investimento.";
  const limite = centavos(faturamento30d * meta);
  if (mensal <= limite) return null;
  return `Orçamento mensal projetado ${reais(mensal)} acima da meta de ${pct(meta, 0)} do faturamento (${reais(limite)}).`;
}
