import { LIMIARES, LIMIAR_QUEDA, MIX, DIAS_SAIDA } from "@/config/limiaresCarteira";

/* ───────── tipos ───────── */

export interface LinhaDiaria {
  seller_id: string;
  data: string;
  tgmv_lc: number | null;
  tsi: number | null;
  visits: number | null;
  tgmv_lc_full: number | null;
  tgmv_lc_flex: number | null;
  tgmv_lc_pads: number | null;
  cdp_tgmv_lc: number | null;
  tgmv_lc_clips: number | null;
  visits_match: number | null;
  visits_cheaper: number | null;
  visits_expensive: number | null;
}

export interface Loja {
  id: string;
  custId: string;
  nickname: string;
  vertical: string | null;
  fechaIn: string | null;
  fechaOut: string | null;
}

export interface Totais {
  linhas: number;
  gmv: number;
  itens: number;
  visitas: number;
  full: number;
  flex: number;
  ads: number;
  promo: number;
  clips: number;
  visMatch: number;
  visCheaper: number;
  visExpensive: number;
}

export interface Janela { ini: string; fim: string; dias: number }
export interface Janelas { atual: Janela; anterior: Janela; anoAnterior: Janela; mesCompleto: boolean }

/* ───────── aritmética segura ───────── */

/** Razão de totais. Denominador zero → null (exibe traço). Entrada não finita → erro explícito. */
export function razao(num: number, den: number): number | null {
  if (!Number.isFinite(num) || !Number.isFinite(den)) {
    throw new Error(`Razão com valor inválido: ${num} / ${den}`);
  }
  if (den === 0) return null;
  return num / den;
}

/** Variação relativa. Base zero → null. */
export function variacao(atual: number | null, base: number | null): number | null {
  if (atual === null || base === null) return null;
  const r = razao(atual - base, base);
  return r;
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? 0 : Number(v));

/* ───────── janelas ───────── */

const pad = (x: number) => String(x).padStart(2, "0");
const diasNoMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Mês corrente até a data de referência; mês anterior e ano anterior na mesma quantidade de dias. */
export function calcularJanelas(ref: string): Janelas {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ref);
  if (!m) throw new Error(`Data de referência inválida: ${ref}`);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const py = mo === 1 ? y - 1 : y, pm = mo === 1 ? 12 : mo - 1;
  const dPrev = Math.min(d, diasNoMes(py, pm));
  const dYoy = Math.min(d, diasNoMes(y - 1, mo));
  return {
    atual: { ini: `${y}-${pad(mo)}-01`, fim: ref, dias: d },
    anterior: { ini: `${py}-${pad(pm)}-01`, fim: `${py}-${pad(pm)}-${pad(dPrev)}`, dias: dPrev },
    anoAnterior: { ini: `${y - 1}-${pad(mo)}-01`, fim: `${y - 1}-${pad(mo)}-${pad(dYoy)}`, dias: dYoy },
    mesCompleto: d === diasNoMes(y, mo),
  };
}

export const dentro = (data: string, j: Janela) => data >= j.ini && data <= j.fim;

/* ───────── agregação ───────── */

export function vazio(): Totais {
  return { linhas: 0, gmv: 0, itens: 0, visitas: 0, full: 0, flex: 0, ads: 0, promo: 0, clips: 0, visMatch: 0, visCheaper: 0, visExpensive: 0 };
}

export function somar(t: Totais, r: LinhaDiaria) {
  t.linhas++;
  t.gmv += n(r.tgmv_lc);
  t.itens += n(r.tsi);
  t.visitas += n(r.visits);
  t.full += n(r.tgmv_lc_full);
  t.flex += n(r.tgmv_lc_flex);
  t.ads += n(r.tgmv_lc_pads);
  t.promo += n(r.cdp_tgmv_lc);
  t.clips += n(r.tgmv_lc_clips);
  t.visMatch += n(r.visits_match);
  t.visCheaper += n(r.visits_cheaper);
  t.visExpensive += n(r.visits_expensive);
}

export function agregarPorLoja(rows: LinhaDiaria[], j: Janela): Map<string, Totais> {
  const out = new Map<string, Totais>();
  for (const r of rows) {
    if (!dentro(r.data, j)) continue;
    const t = out.get(r.seller_id) ?? vazio();
    somar(t, r);
    out.set(r.seller_id, t);
  }
  return out;
}

export function agregarTotal(porLoja: Map<string, Totais>, ids?: Set<string>): Totais {
  const t = vazio();
  for (const [id, x] of porLoja) {
    if (ids && !ids.has(id)) continue;
    (Object.keys(t) as (keyof Totais)[]).forEach((k) => { t[k] += x[k]; });
  }
  return t;
}

export interface Alavancas {
  full: number | null;
  flex: number | null;
  ads: number | null;
  promocao: number | null;
  competitividade: number | null;
  clips: number | null;
}

/** Todas as taxas são razão dos totais (soma ÷ soma). */
export function alavancas(t: Totais): Alavancas {
  return {
    full: razao(t.full, t.gmv),
    flex: razao(t.flex, t.gmv),
    ads: razao(t.ads, t.gmv),
    promocao: razao(t.promo, t.gmv),
    competitividade: razao(t.visMatch + t.visCheaper, t.visMatch + t.visCheaper + t.visExpensive),
    clips: razao(t.clips, t.gmv),
  };
}

export const ticket = (t: Totais) => razao(t.gmv, t.itens);

/** Itens caem e ticket sobe: possível mudança de mix, não queda de demanda. */
export function possivelMudancaMix(dItens: number | null, dTicket: number | null): boolean {
  if (dItens === null || dTicket === null) return false;
  return dItens <= MIX.quedaItens && dTicket >= MIX.altaTicket;
}

/* ───────── alertas por loja ───────── */

export type TipoAlerta = "queda" | "full" | "ads" | "promocao" | "competitividade";

export interface AlertaLoja { tipo: TipoAlerta; valor: number; limite: string }

export interface DiagnosticoLoja {
  loja: Loja;
  gmv: number | null; // null = sem dado no período
  gmvAnterior: number | null;
  queda: number | null;
  alavancas: Alavancas | null;
  alertas: AlertaLoja[];
}

export function diagnosticar(loja: Loja, atual?: Totais, anterior?: Totais): DiagnosticoLoja {
  const gmv = atual ? atual.gmv : null;
  const gmvAnterior = anterior ? anterior.gmv : null;
  const queda = variacao(gmv, gmvAnterior);
  const alav = atual ? alavancas(atual) : null;
  const alertas: AlertaLoja[] = [];
  if (queda !== null && queda <= LIMIAR_QUEDA) alertas.push({ tipo: "queda", valor: queda, limite: `limite ${Math.round(LIMIAR_QUEDA * 100)}%` });
  if (alav) {
    (["full", "ads", "promocao", "competitividade"] as const).forEach((k) => {
      const v = alav[k];
      if (v !== null && v < LIMIARES[k].min) alertas.push({ tipo: k, valor: v, limite: LIMIARES[k].rotulo });
    });
  }
  return { loja, gmv, gmvAnterior, queda, alavancas: alav, alertas };
}

/** Plano de ação: mais alertas primeiro; empate pelo faturamento atual. */
export function ordenarPlano(ds: DiagnosticoLoja[]): DiagnosticoLoja[] {
  return ds
    .filter((d) => d.alertas.length > 0)
    .sort((a, b) => b.alertas.length - a.alertas.length || n(b.gmv) - n(a.gmv));
}

/* ───────── retenção (cruzamentos) ───────── */

export type Cruzamento = "ads" | "promocao" | "full";

export function cruzamentos(ds: DiagnosticoLoja[], limite = 10) {
  const comQueda = ds.filter((d) => d.alertas.some((a) => a.tipo === "queda"));
  const bloco = (k: Cruzamento) =>
    comQueda.filter((d) => d.alertas.some((a) => a.tipo === k)).sort((a, b) => n(a.queda) - n(b.queda));
  const todos = { ads: bloco("ads"), promocao: bloco("promocao"), full: bloco("full") };
  const vezes = new Map<string, number>();
  Object.values(todos).forEach((l) => l.forEach((d) => vezes.set(d.loja.id, (vezes.get(d.loja.id) ?? 0) + 1)));
  return {
    ads: todos.ads.slice(0, limite),
    promocao: todos.promocao.slice(0, limite),
    full: todos.full.slice(0, limite),
    vezes,
  };
}

/* ───────── movimentação ───────── */

export function movimentacao(lojas: Loja[], gmvPorLoja: Map<string, Totais>, j: Janela) {
  const fim = new Date(`${j.fim}T00:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + DIAS_SAIDA);
  const limiteSaida = fim.toISOString().slice(0, 10);
  const entrando = lojas
    .filter((l) => l.fechaIn && l.fechaIn >= j.ini && l.fechaIn <= j.fim)
    .map((l) => ({ loja: l, data: l.fechaIn!, gmv: gmvPorLoja.get(l.id)?.gmv ?? null }))
    .sort((a, b) => b.data.localeCompare(a.data));
  const saindoTodos = lojas
    .filter((l) => l.fechaOut && l.fechaOut >= j.ini && l.fechaOut <= limiteSaida)
    .map((l) => ({ loja: l, data: l.fechaOut!, gmv: gmvPorLoja.get(l.id)?.gmv ?? null }));
  const comReceita = saindoTodos.filter((s) => n(s.gmv) > 0).sort((a, b) => n(b.gmv) - n(a.gmv));
  const semReceita = saindoTodos.filter((s) => n(s.gmv) <= 0).sort((a, b) => a.data.localeCompare(b.data));
  const emRisco = comReceita.reduce((s, x) => s + n(x.gmv), 0);
  return { entrando, saindo: comReceita, saindoSemReceita: semReceita, emRisco, limiteSaida };
}
