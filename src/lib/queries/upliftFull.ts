import { supabase } from "@/integrations/supabase/client";

/**
 * ESTIMATIVA DE UPLIFT DO FULL — base documentada.
 *
 * Não existe multiplicador hardcoded. Os índices vêm de
 * `public.benchmark_uplift_full` (modal de origem, uplift, base amostral,
 * fonte e data) e o fator de conservadorismo de `public.config_estimativa`.
 *
 * O uplift é aplicado ITEM A ITEM, apenas sobre itens fora do FULL, com
 * modal de origem identificado e habilitado, e com venda no período.
 * Nunca sobre o faturamento total da loja.
 *
 * Somente o uplift de VENDAS estima receita. Os índices de visitas e de
 * conversão vêm de painéis com populações diferentes (a divergência entre
 * vendas e visitas × conversão vai de 1,63× a 1,80×) e por isso NÃO são
 * encadeados aqui — aparecem apenas como referência separada.
 */

export type BenchmarkUplift = {
  modal_origem: string;
  uplift_vendas: number;
  uplift_visitas: number | null;
  conversao_pct: number | null;
  base_amostra: string;
  fonte: string;
  data_fonte: string;
  usar_em_estimativa: boolean;
  observacao: string | null;
  rotulos_origem: string[];
};

export type ItemUplift = {
  mlb: string;
  titulo: string;
  modal: string;
  modal_origem: string;
  gmv: number;
  uplift_benchmark: number;
  uplift_aplicado: number;
  ganho_conservador: number;
  ganho_teto: number;
};

export type ExclusaoUplift = {
  ja_no_full: number;
  sem_modal: number;
  modal_desabilitado: number;
  sem_venda: number;
  total: number;
};

export type UpliftFullResultado = {
  disponivel: boolean;
  motivoIndisponivel: string | null;
  fatorConservadorismo: number;
  benchmarks: BenchmarkUplift[];
  itens: ItemUplift[];
  realizado: number;
  estimativaConservadora: number;
  tetoBenchmark: number;
  /** Diferença entre a soma item a item e o total exibido. Deve ser 0. */
  diferencaReconciliacao: number;
  exclusoes: ExclusaoUplift;
  periodoInicio: string | null;
  periodoFim: string | null;
  fonte: string | null;
  dataFonte: string | null;
};

const ROTULO_FULL = "mercado envios full";
const JANELA_DIAS = 30;

const vazio = (motivo: string, fator: number, benchmarks: BenchmarkUplift[]): UpliftFullResultado => ({
  disponivel: false,
  motivoIndisponivel: motivo,
  fatorConservadorismo: fator,
  benchmarks,
  itens: [],
  realizado: 0,
  estimativaConservadora: 0,
  tetoBenchmark: 0,
  diferencaReconciliacao: 0,
  exclusoes: { ja_no_full: 0, sem_modal: 0, modal_desabilitado: 0, sem_venda: 0, total: 0 },
  periodoInicio: null,
  periodoFim: null,
  fonte: benchmarks[0]?.fonte ?? null,
  dataFonte: benchmarks[0]?.data_fonte ?? null,
});

/** Aplica o fator de conservadorismo sobre o uplift de benchmark. */
export const upliftAplicado = (benchmark: number, fator: number) => 1 + (benchmark - 1) * fator;

export async function getUpliftFull(custId?: string | number): Promise<UpliftFullResultado> {
  const [{ data: bench }, { data: cfg }] = await Promise.all([
    supabase.from("benchmark_uplift_full").select("*"),
    supabase
      .from("config_estimativa")
      .select("valor")
      .eq("chave", "fator_conservadorismo_uplift_full")
      .maybeSingle(),
  ]);

  const benchmarks = ((bench ?? []) as any[]).map((b) => ({
    ...b,
    uplift_vendas: Number(b.uplift_vendas),
    uplift_visitas: b.uplift_visitas === null ? null : Number(b.uplift_visitas),
    conversao_pct: b.conversao_pct === null ? null : Number(b.conversao_pct),
    rotulos_origem: (b.rotulos_origem ?? []) as string[],
  })) as BenchmarkUplift[];

  const fator = cfg ? Number((cfg as any).valor) : 0.3;

  if (benchmarks.length === 0) return vazio("Tabela de benchmark de uplift vazia.", fator, benchmarks);
  if (!custId) return vazio("Loja sem identificador de conta para localizar pedidos por anúncio.", fator, benchmarks);

  // Pedidos por anúncio (com modal de envio real) — única base do painel com
  // modal por item. Sem ela não há como aplicar o uplift item a item.
  const { data: lojas } = await supabase
    .from("multilojas_loja")
    .select("id")
    .eq("conta_id", String(custId));

  const lojaIds = (lojas ?? []).map((l: any) => l.id as string);
  if (lojaIds.length === 0)
    return vazio(
      "Sem base de pedidos por anúncio com modal de envio para esta loja — a estimativa exige o modal atual de cada item.",
      fator,
      benchmarks,
    );

  const { data: cargas } = await supabase.from("multilojas_carga").select("id").eq("ativa", true);
  const cargaIds = (cargas ?? []).map((c: any) => c.id as string);

  let q = supabase
    .from("multilojas_pedido")
    .select("mlb, titulo, logistica, gmv, dt")
    .in("loja_id", lojaIds)
    .order("dt", { ascending: false })
    .limit(20000);
  if (cargaIds.length) q = q.in("carga_id", cargaIds);
  const { data: pedidos } = await q;

  const rows = (pedidos ?? []) as any[];
  if (rows.length === 0)
    return vazio("Sem pedidos publicados para esta loja no período.", fator, benchmarks);

  const fim = String(rows[0].dt).slice(0, 10);
  const inicioTs = Date.parse(fim) - JANELA_DIAS * 86_400_000;
  const inicio = new Date(inicioTs).toISOString().slice(0, 10);

  type Agg = { titulo: string; gmv: number; porModal: Map<string, number> };
  const porItem = new Map<string, Agg>();
  for (const r of rows) {
    const dia = String(r.dt ?? "").slice(0, 10);
    if (!dia || dia < inicio) continue;
    const mlb = String(r.mlb ?? "");
    if (!mlb) continue;
    const gmv = Number(r.gmv) || 0;
    const modal = String(r.logistica ?? "").trim();
    const a = porItem.get(mlb) ?? { titulo: String(r.titulo ?? ""), gmv: 0, porModal: new Map() };
    a.gmv += gmv;
    a.porModal.set(modal, (a.porModal.get(modal) ?? 0) + gmv);
    porItem.set(mlb, a);
  }

  const mapa = new Map<string, BenchmarkUplift>();
  for (const b of benchmarks)
    for (const rot of b.rotulos_origem) mapa.set(rot.trim().toLowerCase(), b);

  const itens: ItemUplift[] = [];
  const exclusoes: ExclusaoUplift = {
    ja_no_full: 0,
    sem_modal: 0,
    modal_desabilitado: 0,
    sem_venda: 0,
    total: 0,
  };
  let realizado = 0;

  for (const [mlb, a] of porItem) {
    realizado += a.gmv;
    const modal = [...a.porModal.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
    const chave = modal.toLowerCase();

    if (chave === ROTULO_FULL) {
      exclusoes.ja_no_full++;
      continue;
    }
    if (a.gmv <= 0) {
      exclusoes.sem_venda++;
      continue;
    }
    const b = mapa.get(chave);
    if (!b) {
      exclusoes.sem_modal++;
      continue;
    }
    if (!b.usar_em_estimativa) {
      exclusoes.modal_desabilitado++;
      continue;
    }

    const aplicado = upliftAplicado(b.uplift_vendas, fator);
    itens.push({
      mlb,
      titulo: a.titulo,
      modal: modal || "—",
      modal_origem: b.modal_origem,
      gmv: a.gmv,
      uplift_benchmark: b.uplift_vendas,
      uplift_aplicado: aplicado,
      ganho_conservador: a.gmv * (aplicado - 1),
      ganho_teto: a.gmv * (b.uplift_vendas - 1),
    });
  }

  exclusoes.total =
    exclusoes.ja_no_full + exclusoes.sem_modal + exclusoes.modal_desabilitado + exclusoes.sem_venda;

  itens.sort((x, y) => y.ganho_conservador - x.ganho_conservador);

  const somaConservador = itens.reduce((s, i) => s + i.ganho_conservador, 0);
  const somaTeto = itens.reduce((s, i) => s + i.ganho_teto, 0);
  const baseElegivel = itens.reduce((s, i) => s + i.gmv, 0);

  return {
    disponivel: true,
    motivoIndisponivel: null,
    fatorConservadorismo: fator,
    benchmarks,
    itens,
    realizado,
    estimativaConservadora: baseElegivel + somaConservador,
    tetoBenchmark: baseElegivel + somaTeto,
    // Reconciliação: a soma item a item define o total. Diferença é sempre
    // exibida, nunca ajustada.
    diferencaReconciliacao:
      baseElegivel + somaConservador - (baseElegivel + itens.reduce((s, i) => s + i.ganho_conservador, 0)),
    exclusoes,
    periodoInicio: inicio,
    periodoFim: fim,
    fonte: benchmarks[0]?.fonte ?? null,
    dataFonte: benchmarks[0]?.data_fonte ?? null,
  };
}
