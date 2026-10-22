// Publicidade: indicadores por período, alertas por anúncio e associações na conta. Sem I/O.
// Indicadores sempre a partir de somas; comparação entre grupos sempre por mediana.
// Associação não é causa: os textos dizem isso, e grupos pequenos não são comparados.

import {
  type Indicadores,
  indicadores,
  lerLimites,
  type LinhaMetrica,
  type Limites,
  type Somas,
  somar,
} from "../../supabase/functions/_shared/mlAdsGestao";
import { brl, num, pctFracao, vezes } from "@/lib/format";

/** Mínimos do painel para julgar um anúncio ou um grupo (o ML não publica esses números). */
export const REGRAS_ADS = {
  /** Cliques sem nenhuma venda a partir dos quais o gasto é apontado. */
  cliquesSemVenda: 30,
  /** Impressões mínimas para julgar CTR. */
  impressoesCtr: 1000,
  /** Cliques mínimos para julgar conversão. */
  cliquesCvr: 50,
  /** Anúncios mínimos em cada lado para comparar medianas. */
  minimoGrupo: 5,
};

// ── Períodos ────────────────────────────────────────────────────────────────

const DIA_MS = 86_400_000;
const paraData = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const somarDias = (iso: string, dias: number) => new Date(paraData(iso) + dias * DIA_MS).toISOString().slice(0, 10);

/** Data de hoje em São Paulo (YYYY-MM-DD). */
export function hojeSp(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

export type Periodo = { de: string; ate: string };

/** Período atual: os últimos n dias até hoje. Anterior: os n dias antes dele. */
export function periodos(hoje: string, n: number): { atual: Periodo; anterior: Periodo } {
  return {
    atual: { de: somarDias(hoje, -(n - 1)), ate: hoje },
    anterior: { de: somarDias(hoje, -(2 * n - 1)), ate: somarDias(hoje, -n) },
  };
}

export type LinhaDia = LinhaMetrica & { dia: string };

export function somasPorPeriodo(linhas: LinhaDia[], hoje: string, n: number): { atual: Somas; anterior: Somas } {
  const p = periodos(hoje, n);
  const dentro = (l: LinhaDia, x: Periodo) => l.dia >= x.de && l.dia <= x.ate;
  return {
    atual: somarPorDia(linhas.filter((l) => dentro(l, p.atual))),
    anterior: somarPorDia(linhas.filter((l) => dentro(l, p.anterior))),
  };
}

/** Soma linhas de várias campanhas; "dias" conta dias distintos com dado. */
function somarPorDia(linhas: LinhaDia[]): Somas {
  const s = somar(linhas);
  return { ...s, dias: new Set(linhas.map((l) => l.dia)).size };
}

/** Variação relativa (0,1 = +10%). Sem base, sem variação. */
export const variacao = (atual: number | null, anterior: number | null) =>
  atual != null && anterior != null && anterior !== 0 ? (atual - anterior) / Math.abs(anterior) : null;

// ── Anúncio (Ad Group) ──────────────────────────────────────────────────────

/** Uma linha de ml_ads_painel_grupos. */
export type GrupoPainel = {
  ad_group_id: number;
  campaign_id: number | null;
  status: string | null;
  tipo: string | null;
  external_id: string | null;
  titulo: string | null;
  custo: number | null;
  receita: number | null;
  cliques: number | null;
  impressoes: number | null;
  unidades: number | null;
  dias: number;
  custo_ant: number | null;
  receita_ant: number | null;
  cliques_ant: number | null;
  impressoes_ant: number | null;
  unidades_ant: number | null;
  dias_ant: number;
  item_id: string | null;
  thumbnail: string | null;
  link: string | null;
  anuncios: number;
  anuncios_ativos: number;
  estoque: number | null;
  frete_gratis: boolean | null;
  logistica: string | null;
  preco: number | null;
  qualidade_score: number | null;
  qualidade_nivel: string | null;
  fotos: number | null;
  fotos_abaixo_minimo: number | null;
  fotos_abaixo_recomendado: number | null;
  ficha_obrigatorios: number | null;
  achados_altos: number | null;
  analisado_em: string | null;
};

export type NivelQualidade = "basica" | "satisfatoria" | "profissional";
export const NOME_QUALIDADE: Record<NivelQualidade, string> = { basica: "Básica", satisfatoria: "Satisfatória", profissional: "Profissional" };

/** Nível de qualidade do ML (/item/{id}/performance) pelo texto que a API manda. */
export function nivelQualidade(texto: string | null): NivelQualidade | null {
  const t = (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("basic")) return "basica";
  if (t.includes("satisf")) return "satisfatoria";
  if (t.includes("profission") || t.includes("professional")) return "profissional";
  return null;
}

export type SituacaoFotos = "abaixo_minimo" | "abaixo_recomendado" | "ok";

export type AlertaAds = {
  id: string;
  nivel: "alto" | "medio" | "oportunidade";
  texto: string;
  acao: string;
};

export type GrupoAnalisado = GrupoPainel & {
  ind: Indicadores;
  indAnt: Indicadores;
  qualidade: NivelQualidade | null;
  fotosSituacao: SituacaoFotos | null;
  fichaIncompleta: boolean | null;
  semEstoque: boolean | null;
  pausadoNoMl: boolean | null;
  alertas: AlertaAds[];
};

const somasDoGrupo = (g: GrupoPainel, anterior: boolean): Somas => ({
  custo: (anterior ? g.custo_ant : g.custo) ?? 0,
  receita: (anterior ? g.receita_ant : g.receita) ?? 0,
  cliques: (anterior ? g.cliques_ant : g.cliques) ?? 0,
  impressoes: (anterior ? g.impressoes_ant : g.impressoes) ?? 0,
  unidades: (anterior ? g.unidades_ant : g.unidades) ?? 0,
  dias: anterior ? g.dias_ant : g.dias,
});

function situacaoFotos(g: GrupoPainel): SituacaoFotos | null {
  if (g.fotos == null) return null;
  if ((g.fotos_abaixo_minimo ?? 0) > 0) return "abaixo_minimo";
  if ((g.fotos_abaixo_recomendado ?? 0) > 0) return "abaixo_recomendado";
  return "ok";
}

export function mediana(valores: number[]): number | null {
  const s = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Conversão mediana da conta entre anúncios com cliques suficientes para julgar. */
export function cvrMediana(grupos: { ind: Indicadores; cliques: number | null }[]): number | null {
  return mediana(grupos.filter((g) => (g.cliques ?? 0) >= REGRAS_ADS.cliquesCvr && g.ind.cvr != null).map((g) => g.ind.cvr!));
}

export type ContextoAlertas = {
  limites: Limites;
  /** ROAS alvo de cada campanha, para comparar com o do anúncio. */
  roasAlvo: Map<number, number | null>;
  cvrMediana: number | null;
};

/** Alertas que cruzam a qualidade do anúncio com o desempenho em Ads. Ordem: alto, médio, oportunidade. */
export function alertasDoAnuncio(g: GrupoAnalisado, c: ContextoAlertas): AlertaAds[] {
  const a: AlertaAds[] = [];
  const ativo = g.status === "active";
  const i = g.ind;
  const alvo = g.campaign_id != null ? c.roasAlvo.get(g.campaign_id) ?? null : null;
  const roasRef = Math.max(c.limites.alerta_roas, alvo ?? 0);

  if (ativo && g.semEstoque) {
    a.push({ id: "sem_estoque", nivel: "alto", texto: "Ativo em Ads sem estoque no anúncio.", acao: "Pausar no Ads ou repor o estoque." });
  }
  if (ativo && g.pausadoNoMl) {
    a.push({ id: "pausado_ml", nivel: "alto", texto: "Ativo em Ads com o anúncio pausado no Mercado Livre.", acao: "Pausar no Ads ou reativar o anúncio." });
  }
  if ((g.cliques ?? 0) >= REGRAS_ADS.cliquesSemVenda && (g.unidades ?? 0) === 0 && i.investimento > 0) {
    a.push({
      id: "sem_venda",
      nivel: "alto",
      texto: `${num(g.cliques)} cliques e ${brl(i.investimento, true)} investidos sem venda no período.`,
      acao: "Rever preço, fotos e ficha, ou pausar o anúncio no Ads.",
    });
  }
  if (g.qualidade === "basica" && i.investimento > 0 && ((i.roas != null && i.roas < roasRef) || (i.acos != null && i.acos > c.limites.alerta_acos))) {
    a.push({
      id: "qualidade_roas",
      nivel: "alto",
      texto: `Qualidade Básica no ML com ROAS ${vezes(i.roas)} e ACOS ${pctFracao(i.acos)} (referência: ROAS ${vezes(roasRef)}, ACOS até ${pctFracao(c.limites.alerta_acos)}).`,
      acao: "Melhorar o anúncio (aba Melhorias) antes de investir mais nele.",
    });
  }
  if (g.fotosSituacao && g.fotosSituacao !== "ok" && (g.impressoes ?? 0) >= REGRAS_ADS.impressoesCtr && i.ctr != null && i.ctr < c.limites.alerta_ctr) {
    a.push({
      id: "fotos_ctr",
      nivel: "medio",
      texto: `${g.fotosSituacao === "abaixo_minimo" ? `${g.fotos_abaixo_minimo} foto(s) abaixo de 500 px` : `${g.fotos_abaixo_recomendado} foto(s) abaixo de 1200 px`} e CTR ${pctFracao(i.ctr, 2)} (limite ${pctFracao(c.limites.alerta_ctr, 2)}).`,
      acao: "Trocar por fotos de 1200 px ou mais no menor lado.",
    });
  } else if (g.fotosSituacao === "abaixo_minimo" && ativo && i.investimento > 0) {
    a.push({
      id: "fotos_minimo",
      nivel: "medio",
      texto: `${g.fotos_abaixo_minimo} foto(s) abaixo do mínimo de 500 px em anúncio com investimento.`,
      acao: "Trocar por fotos de 1200 px ou mais no menor lado.",
    });
  }
  const cvrBaixa = c.cvrMediana != null && (g.cliques ?? 0) >= REGRAS_ADS.cliquesCvr && i.cvr != null && i.cvr < c.cvrMediana;
  if (cvrBaixa && g.fichaIncompleta) {
    a.push({
      id: "ficha_cvr",
      nivel: "medio",
      texto: `${g.ficha_obrigatorios} atributo(s) obrigatório(s) vazio(s) e conversão ${pctFracao(i.cvr)} abaixo da mediana da conta (${pctFracao(c.cvrMediana)}).`,
      acao: "Completar a ficha técnica (aba Melhorias).",
    });
  }
  if (cvrBaixa && g.frete_gratis === false) {
    a.push({
      id: "frete_cvr",
      nivel: "medio",
      texto: `Sem frete grátis e conversão ${pctFracao(i.cvr)} abaixo da mediana da conta (${pctFracao(c.cvrMediana)}).`,
      acao: "Avaliar frete grátis ou preço com frete.",
    });
  }
  if (ativo && i.roas != null && i.roas >= roasRef && (g.unidades ?? 0) > 0 && g.qualidade !== "basica" && g.semEstoque === false) {
    a.push({
      id: "escalar",
      nivel: "oportunidade",
      texto: `ROAS ${vezes(i.roas)} acima da referência de ${vezes(roasRef)}, com estoque${g.qualidade ? ` e qualidade ${NOME_QUALIDADE[g.qualidade]}` : ""}.`,
      acao: "Candidato a mais orçamento ou a uma campanha de crescimento.",
    });
  }
  return a;
}

export function analisarGrupos(linhas: GrupoPainel[], ctx: Omit<ContextoAlertas, "cvrMediana">): { grupos: GrupoAnalisado[]; cvrMediana: number | null } {
  const base = linhas.map((g): GrupoAnalisado => ({
    ...g,
    ind: indicadores(somasDoGrupo(g, false)),
    indAnt: indicadores(somasDoGrupo(g, true)),
    qualidade: nivelQualidade(g.qualidade_nivel),
    fotosSituacao: situacaoFotos(g),
    fichaIncompleta: g.ficha_obrigatorios == null ? null : g.ficha_obrigatorios > 0,
    semEstoque: g.anuncios > 0 ? (g.estoque ?? 0) <= 0 : null,
    pausadoNoMl: g.anuncios > 0 ? g.anuncios_ativos === 0 : null,
    alertas: [],
  }));
  const cvr = cvrMediana(base);
  const c = { ...ctx, cvrMediana: cvr };
  for (const g of base) g.alertas = alertasDoAnuncio(g, c);
  return { grupos: base, cvrMediana: cvr };
}

// ── Associações na conta ────────────────────────────────────────────────────

export type LadoComparacao = { rotulo: string; n: number; mediana: number | null };
export type Associacao = {
  id: string;
  titulo: string;
  metrica: "roas" | "acos" | "ctr" | "cvr";
  /** Lado com o atributo ruim (ex.: fotos abaixo de 1200 px) e lado sem ele. */
  com: LadoComparacao;
  sem: LadoComparacao;
  /** true quando o lado com o atributo ruim tem desempenho pior na mediana. */
  pior: boolean | null;
  leitura: string;
};

const NOME_METRICA = { roas: "ROAS", acos: "ACOS", ctr: "CTR", cvr: "conversão" } as const;
const maiorMelhor = { roas: true, acos: false, ctr: true, cvr: true } as const;
const formatar = (m: Associacao["metrica"], v: number | null) => (m === "roas" ? vezes(v) : pctFracao(v, m === "ctr" ? 2 : 1));

/** Anúncios com volume suficiente para a métrica entrar na comparação. */
function elegivel(g: GrupoAnalisado, m: Associacao["metrica"]): boolean {
  if (m === "roas") return g.ind.investimento > 0 && g.ind.roas != null;
  if (m === "acos") return g.ind.receita > 0 && g.ind.acos != null;
  if (m === "ctr") return (g.impressoes ?? 0) >= REGRAS_ADS.impressoesCtr && g.ind.ctr != null;
  return (g.cliques ?? 0) >= REGRAS_ADS.cliquesCvr && g.ind.cvr != null;
}

function comparar(
  grupos: GrupoAnalisado[],
  id: string,
  titulo: string,
  metrica: Associacao["metrica"],
  lado: (g: GrupoAnalisado) => boolean | null,
  rotulos: [string, string],
): Associacao {
  const validos = grupos.filter((g) => elegivel(g, metrica) && lado(g) != null);
  const valor = (g: GrupoAnalisado) => g.ind[metrica] as number;
  const comG = validos.filter((g) => lado(g) === true).map(valor);
  const semG = validos.filter((g) => lado(g) === false).map(valor);
  const com = { rotulo: rotulos[0], n: comG.length, mediana: mediana(comG) };
  const sem = { rotulo: rotulos[1], n: semG.length, mediana: mediana(semG) };
  const suficiente = com.n >= REGRAS_ADS.minimoGrupo && sem.n >= REGRAS_ADS.minimoGrupo;
  const pior = suficiente && com.mediana != null && sem.mediana != null && com.mediana !== sem.mediana
    ? (maiorMelhor[metrica] ? com.mediana < sem.mediana : com.mediana > sem.mediana)
    : suficiente ? false : null;
  const nome = NOME_METRICA[metrica];
  const leitura = !suficiente
    ? `Poucos anúncios para comparar (${com.n} e ${sem.n}; mínimo ${REGRAS_ADS.minimoGrupo} em cada lado).`
    : `${com.rotulo}: ${nome} mediano ${formatar(metrica, com.mediana)} (${com.n} anúncios) contra ${formatar(metrica, sem.mediana)} em ${sem.rotulo.toLowerCase()} (${sem.n}). ${
      pior ? "Pior no grupo com o problema." : "Sem desvantagem visível para o grupo com o problema."
    } Associação nos dados da conta, não prova de causa.`;
  return { id, titulo, metrica, com, sem, pior, leitura };
}

export function associacoes(grupos: GrupoAnalisado[]): Associacao[] {
  const qualidade = (g: GrupoAnalisado) => (g.qualidade ? g.qualidade === "basica" : null);
  const fotos = (g: GrupoAnalisado) => (g.fotosSituacao ? g.fotosSituacao !== "ok" : null);
  return [
    comparar(grupos, "qualidade_roas", "Qualidade do anúncio × ROAS", "roas", qualidade, ["Qualidade Básica", "Satisfatória ou Profissional"]),
    comparar(grupos, "qualidade_acos", "Qualidade do anúncio × ACOS", "acos", qualidade, ["Qualidade Básica", "Satisfatória ou Profissional"]),
    comparar(grupos, "fotos_ctr", "Resolução das fotos × CTR", "ctr", fotos, ["Fotos abaixo de 1200 px", "Fotos de 1200 px ou mais"]),
    comparar(grupos, "fotos_roas", "Resolução das fotos × ROAS", "roas", fotos, ["Fotos abaixo de 1200 px", "Fotos de 1200 px ou mais"]),
    comparar(grupos, "ficha_cvr", "Ficha técnica × conversão", "cvr", (g) => g.fichaIncompleta, ["Ficha com obrigatórios vazios", "Ficha completa"]),
    comparar(grupos, "frete_acos", "Frete grátis × ACOS", "acos", (g) => (g.frete_gratis == null ? null : !g.frete_gratis), ["Sem frete grátis", "Com frete grátis"]),
  ];
}

// ── Painel da conta ─────────────────────────────────────────────────────────

/** Uma linha de ml_ads_campaigns. */
export type CampanhaLinha = {
  campaign_id: number;
  name: string | null;
  status: string | null;
  strategy: string | null;
  budget: number | null;
  daily_budget: number | null;
  roas_target: number | null;
  acos_target: number | null;
};

export type LinhaCampanhaDia = LinhaDia & { campaign_id: number };

const ativa = (s: string | null) => (s ?? "").toLowerCase() === "active";
export const orcamentoDiario = (c: CampanhaLinha) => c.budget ?? c.daily_budget ?? 0;

/** Tudo o que a tela de Publicidade mostra, a partir das tabelas lidas. TACOS só no período atual (faturamento de 30 dias). */
export function montarPainel(d: {
  campanhas: CampanhaLinha[];
  serie: LinhaCampanhaDia[];
  grupos: GrupoPainel[];
  settings: Record<string, unknown> | null;
  faturamento: number | null;
}, hoje = hojeSp(), dias = 30) {
  const limites = lerLimites(d.settings);
  const conta = somasPorPeriodo(d.serie, hoje, dias);
  const porCampanha = new Map(d.campanhas.map((c) => {
    const s = somasPorPeriodo(d.serie.filter((l) => l.campaign_id === c.campaign_id), hoje, dias);
    return [c.campaign_id, { somas: s.atual, atual: indicadores(s.atual), anterior: indicadores(s.anterior) }];
  }));
  const roasAlvo = new Map(d.campanhas.map((c) => [c.campaign_id, c.roas_target]));
  const analise = analisarGrupos(d.grupos, { limites, roasAlvo });
  return {
    hoje,
    dias,
    periodo: periodos(hoje, dias),
    limites,
    faturamento: d.faturamento,
    campanhas: d.campanhas,
    porCampanha,
    conta: { somas: conta.atual, atual: indicadores(conta.atual, d.faturamento), anterior: indicadores(conta.anterior) },
    orcamentoAtivo: Math.round(d.campanhas.filter((c) => ativa(c.status)).reduce((s, c) => s + orcamentoDiario(c), 0) * 100) / 100,
    grupos: analise.grupos,
    cvrMediana: analise.cvrMediana,
  };
}

export type PainelAds = ReturnType<typeof montarPainel>;

/** Quanto do investimento do período vai para anúncios com cada problema (pesa no TACOS da conta). */
export function investimentoEmRisco(grupos: GrupoAnalisado[]): { id: string; rotulo: string; anuncios: number; custo: number; fracao: number | null }[] {
  const total = grupos.reduce((s, g) => s + g.ind.investimento, 0);
  const faixa = (id: string, rotulo: string, f: (g: GrupoAnalisado) => boolean) => {
    const gs = grupos.filter((g) => g.ind.investimento > 0 && f(g));
    const custo = Math.round(gs.reduce((s, g) => s + g.ind.investimento, 0) * 100) / 100;
    return { id, rotulo, anuncios: gs.length, custo, fracao: total > 0 ? custo / total : null };
  };
  return [
    faixa("sem_venda", "Sem venda no período", (g) => (g.unidades ?? 0) === 0),
    faixa("qualidade", "Qualidade Básica no ML", (g) => g.qualidade === "basica"),
    faixa("fotos", "Fotos abaixo de 1200 px", (g) => g.fotosSituacao != null && g.fotosSituacao !== "ok"),
    faixa("ficha", "Ficha com obrigatórios vazios", (g) => g.fichaIncompleta === true),
    faixa("estoque", "Sem estoque ou pausado no ML", (g) => g.semEstoque === true || g.pausadoNoMl === true),
    faixa("sem_analise", "Sem análise de qualidade ainda", (g) => g.analisado_em == null),
  ];
}
