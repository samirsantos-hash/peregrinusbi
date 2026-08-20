import { supabase } from "@/integrations/supabase/client";

/**
 * FONTE E UNIDADES — auditado em 2026-08 contra sellers_kpi_daily:
 *
 * `seller_eligibility.pedidos_7d` NÃO são pedidos. Somando a coluna por seller
 * num snapshot e comparando com a base diária dos mesmos 7 dias:
 *   WOOPS     Σ pedidos_7d 294.470 · visits 287.515 · tsi 15.307
 *   MEGABYTE  Σ pedidos_7d 231.000 · visits 225.008 · tsi  8.979
 * A coluna acompanha VISITAS, não unidades vendidas. Por isso é tratada aqui
 * como `visitas_7d` e nunca rotulada como pedido/venda na interface.
 *
 * Unidades vendidas por anúncio NÃO existem na base. O que existe é a taxa de
 * conversão do seller (Σ tsi / Σ visits em sellers_kpi_daily) — usada para
 * ESTIMAR unidades por item. Toda métrica derivada dela é marcada 'estimado'.
 *
 * JANELAS — os snapshots de elegibilidade chegam a cada 2–5 dias e a coluna já
 * é uma janela móvel de 7 dias. Janelas de 15 e 30 dias eram reconstruídas por
 * proporção (mesma taxa diária repetida), o que criava falsa tendência. Foram
 * removidas: só existe a janela de 7 dias medida na fonte, mais a comparação
 * com um snapshot de 7 dias independente ~28 dias antes.
 */

export type EstadoItem = "ok" | "sem_movimento" | "sem_estoque" | "sem_dado";

export type Prioridade =
  | "alta"
  | "media"
  | "baixa"
  | "repor_estoque"
  | "sem_movimento"
  | "sem_dado";

export type FullCandidate = {
  item_id: string;
  item_name: string;
  vertical: string;
  /** Visitas na janela móvel de 7 dias (dado real da fonte). */
  visitas_7d: number | null;
  /** Visitas 7d de um snapshot independente ~28 dias antes (null se ausente). */
  visitas_7d_anterior: number | null;
  /** Variação entre as duas janelas de 7 dias medidas. null se não comparável. */
  tendencia: number | null;
  /** Unidades vendidas estimadas em 7 dias = visitas × conversão do seller. */
  unidades_est_7d: number | null;
  /** GMV estimado em 30 dias = unidades est. × ticket médio do seller. */
  gmv_est_30d: number | null;
  estoque: number;
  cobertura_dias: number | null;
  risco_ruptura: number;
  score_oportunidade: number | null;
  estado: EstadoItem;
  prioridade: Prioridade;
  flag_optin: boolean;
  desconto: number;
  snapshots: number;
  acao: string;
  justificativa: string;
};

export type ClasseResumo = {
  chave: Prioridade;
  label: string;
  regra: string;
  itens: number;
};

export type FullPortfolio = {
  candidatos: FullCandidate[];
  /** Σ GMV estimado 30d dos itens classificados como alta/média. */
  gmvEstimadoRecomendado: number;
  itensRecomendados: number;
  classes: ClasseResumo[];
  /** Conversão real do seller (tsi/visits, 30d). null quando não medida. */
  taxaConversao: number | null;
  /** Ticket médio real do seller (tgmv_lc/tsi, 30d). null quando não medido. */
  ticketMedio: number | null;
  visitasTotais7d: number;
  dataReferencia: string | null;
  dataReferenciaAnterior: string | null;
};

export const FULL_ESTOQUE_MINIMO_DIAS = 30;
const JANELA_MAX_DIAS = 40;
const OFFSET_COMPARACAO = 28;

const diasEntre = (a: string, b: string) =>
  Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

const CLASSES: Omit<ClasseResumo, "itens">[] = [
  {
    chave: "alta",
    label: "Alta",
    regra: "Score de oportunidade ≥ 70 e estoque cobre ≥ 30 dias da demanda estimada.",
  },
  {
    chave: "media",
    label: "Média",
    regra: "Score de oportunidade entre 40 e 69 com estoque suficiente.",
  },
  {
    chave: "baixa",
    label: "Baixa",
    regra: "Score de oportunidade < 40 — demanda pequena frente ao resto da carteira.",
  },
  {
    chave: "repor_estoque",
    label: "Repor estoque",
    regra:
      "Tem visitas e venda estimada > 0 e o estoque cobre menos de 30 dias (inclui estoque zerado). Nunca aplicado a item sem movimento.",
  },
  {
    chave: "sem_movimento",
    label: "Sem movimento",
    regra:
      "Snapshot mais recente com 0 visitas em 7 dias — investigar queda (preço, anúncio, pausa). Não recebe recomendação de compra.",
  },
  {
    chave: "sem_dado",
    label: "Sem dado",
    regra: "Nenhum snapshot do item na janela analisada — nada é recomendado.",
  },
];

function percentil(valoresOrdenados: number[], v: number): number {
  if (valoresOrdenados.length === 0) return 0;
  let abaixo = 0;
  for (const x of valoresOrdenados) if (x < v) abaixo++;
  return (abaixo / valoresOrdenados.length) * 100;
}

export async function getFullRecommendations(
  sellerId: string,
  _custId?: string | number,
): Promise<FullPortfolio> {
  const vazio: FullPortfolio = {
    candidatos: [],
    gmvEstimadoRecomendado: 0,
    itensRecomendados: 0,
    classes: CLASSES.map((c) => ({ ...c, itens: 0 })),
    taxaConversao: null,
    ticketMedio: null,
    visitasTotais7d: 0,
    dataReferencia: null,
    dataReferenciaAnterior: null,
  };

  const [{ data: eleg }, { data: diario }] = await Promise.all([
    supabase
      .from("seller_eligibility")
      .select(
        "item_id, item_name, vertical_item, pedidos_7d, estoque_medio_7d, flag_item_s_optin, discount_seller_percentage, data",
      )
      .eq("seller_id", sellerId)
      .order("data", { ascending: false })
      .limit(8000),
    supabase
      .from("sellers_kpi_daily")
      .select("data, tsi, visits, tgmv_lc")
      .eq("seller_id", sellerId)
      .order("data", { ascending: false })
      .limit(45),
  ]);

  const rows = (eleg ?? []) as any[];
  if (rows.length === 0) return vazio;

  // Conversão e ticket REAIS do seller (30 dias de base diária).
  const dRows = ((diario ?? []) as any[]).slice(0, 30);
  const somaTsi = dRows.reduce((s, r) => s + (Number(r.tsi) || 0), 0);
  const somaVisits = dRows.reduce((s, r) => s + (Number(r.visits) || 0), 0);
  const somaGmv = dRows.reduce((s, r) => s + (Number(r.tgmv_lc) || 0), 0);
  const taxaConversao = somaVisits > 0 && somaTsi > 0 ? somaTsi / somaVisits : null;
  const ticketMedio = somaTsi > 0 && somaGmv > 0 ? somaGmv / somaTsi : null;

  const datas = [...new Set(rows.map((r) => String(r.data ?? "")).filter(Boolean))].sort();
  const ref = datas[datas.length - 1] ?? "";

  type Agg = { base: any; snaps: { data: string; visitas: number }[] };
  const porItem = new Map<string, Agg>();
  for (const row of rows) {
    const key = String(row.item_id ?? "");
    if (!key) continue;
    const data = String(row.data ?? ref);
    if (ref && diasEntre(ref, data) > JANELA_MAX_DIAS) continue;
    const snap = { data, visitas: Number(row.pedidos_7d) || 0 };
    const atual = porItem.get(key);
    if (!atual) porItem.set(key, { base: row, snaps: [snap] });
    else atual.snaps.push(snap);
  }
  if (porItem.size === 0) return vazio;

  const candidatos: FullCandidate[] = [];

  for (const [itemId, agg] of porItem) {
    const item = agg.base;
    const estoque = Number(item.estoque_medio_7d) || 0;
    const snaps = agg.snaps
      .slice()
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .filter((s, i, arr) => i === 0 || arr[i - 1].data !== s.data);

    const atual = snaps.find((s) => s.data === ref) ?? null;
    const visitas_7d = atual ? atual.visitas : null;

    // Segunda janela de 7 dias, medida de forma independente (~28 dias antes).
    let anterior: { data: string; visitas: number } | null = null;
    let melhorDist = Infinity;
    for (const s of snaps) {
      const d = ref ? diasEntre(ref, s.data) : 0;
      if (d < OFFSET_COMPARACAO - 7 || d > OFFSET_COMPARACAO + 7) continue;
      const dist = Math.abs(d - OFFSET_COMPARACAO);
      if (dist < melhorDist) {
        melhorDist = dist;
        anterior = s;
      }
    }

    const tendencia =
      visitas_7d !== null && anterior && anterior.visitas > 0
        ? visitas_7d / anterior.visitas - 1
        : null;

    const unidades_est_7d =
      visitas_7d !== null && taxaConversao !== null ? visitas_7d * taxaConversao : null;
    const gmv_est_30d =
      unidades_est_7d !== null && ticketMedio !== null
        ? unidades_est_7d * (30 / 7) * ticketMedio
        : null;

    const unidadesDia = unidades_est_7d !== null ? unidades_est_7d / 7 : null;
    const cobertura_dias =
      unidadesDia && unidadesDia > 0 ? Math.min(estoque / unidadesDia, 365) : null;
    const risco_ruptura =
      cobertura_dias === null
        ? 0
        : Math.exp(-cobertura_dias / FULL_ESTOQUE_MINIMO_DIAS);

    const estado: EstadoItem =
      visitas_7d === null
        ? "sem_dado"
        : visitas_7d === 0
          ? "sem_movimento"
          : estoque === 0
            ? "sem_estoque"
            : "ok";

    candidatos.push({
      item_id: itemId,
      item_name: item.item_name ?? "",
      vertical: item.vertical_item ?? "Outros",
      visitas_7d,
      visitas_7d_anterior: anterior?.visitas ?? null,
      tendencia,
      unidades_est_7d,
      gmv_est_30d,
      estoque,
      cobertura_dias,
      risco_ruptura,
      score_oportunidade: null,
      estado,
      prioridade: "sem_dado",
      flag_optin: Boolean(item.flag_item_s_optin),
      desconto: Number(item.discount_seller_percentage) || 0,
      snapshots: snaps.length,
      acao: "",
      justificativa: "",
    });
  }

  // Score de oportunidade: percentil do GMV estimado de 30 dias dentro da
  // carteira do seller, descontado pelo risco de ruptura (peso 40%).
  const gmvs = candidatos
    .map((c) => c.gmv_est_30d ?? 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  for (const c of candidatos) {
    if (c.estado === "sem_dado") {
      c.prioridade = "sem_dado";
      c.acao = "Sem snapshot do anúncio na janela analisada — nada a recomendar.";
      c.justificativa = "Sem dado no período";
      continue;
    }

    if (c.estado === "sem_movimento") {
      c.prioridade = "sem_movimento";
      c.acao =
        c.estoque > 0
          ? `Investigar queda: 0 visitas em 7 dias com ${c.estoque.toFixed(0)} un em estoque. Verifique preço, status do anúncio e concorrência antes de qualquer compra.`
          : "Investigar queda: 0 visitas em 7 dias e sem estoque registrado. Confirme se o anúncio está ativo.";
      c.justificativa = `0 visitas na janela de 7 dias · ${c.snapshots} snapshot(s)`;
      continue;
    }

    if (c.gmv_est_30d === null) {
      c.prioridade = "sem_dado";
      c.acao =
        "Sem taxa de conversão medida para este seller na base diária — unidades e GMV não podem ser estimados.";
      c.justificativa = `${c.visitas_7d?.toLocaleString("pt-BR")} visitas/7d · conversão indisponível`;
      continue;
    }

    c.score_oportunidade =
      percentil(gmvs, c.gmv_est_30d) * (1 - 0.4 * c.risco_ruptura);

    const temDemanda = (c.unidades_est_7d ?? 0) > 0;
    const coberturaCurta =
      temDemanda && (c.cobertura_dias === null || c.cobertura_dias < FULL_ESTOQUE_MINIMO_DIAS);

    if (coberturaCurta) c.prioridade = "repor_estoque";
    else if (c.score_oportunidade >= 70) c.prioridade = "alta";
    else if (c.score_oportunidade >= 40) c.prioridade = "media";
    else c.prioridade = "baixa";

    const gmvTxt = c.gmv_est_30d.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
    const unTxt = (c.unidades_est_7d ?? 0).toFixed(1);

    c.acao =
      c.prioridade === "repor_estoque"
        ? `Repor estoque antes de enviar ao Full: ${c.estoque.toFixed(0)} un cobrem ${c.cobertura_dias === null ? "menos de 1" : c.cobertura_dias.toFixed(0)} dias da venda estimada (mínimo ${FULL_ESTOQUE_MINIMO_DIAS}).`
        : c.prioridade === "alta"
          ? `Enviar para Full: está no topo da carteira em demanda estimada (${gmvTxt}/30d) com estoque suficiente.`
          : c.prioridade === "media"
            ? `Candidato médio — agendar no próximo ciclo. Demanda estimada ${gmvTxt}/30d.`
            : `Monitorar. Demanda estimada baixa (${gmvTxt}/30d) frente ao resto da carteira.`;

    const tendTxt =
      c.tendencia === null
        ? "sem janela anterior comparável"
        : c.tendencia > 0.15
          ? `visitas +${(c.tendencia * 100).toFixed(0)}% vs 7d de ~28 dias atrás`
          : c.tendencia < -0.15
            ? `visitas ${(c.tendencia * 100).toFixed(0)}% vs 7d de ~28 dias atrás`
            : "visitas estáveis vs janela anterior";

    c.justificativa = `${c.visitas_7d?.toLocaleString("pt-BR")} visitas/7d · ${unTxt} un vendidas (est.) · ${tendTxt} · estoque ${c.cobertura_dias === null ? "—" : `${c.cobertura_dias.toFixed(0)} dias`}`;
  }

  const ordem: Record<Prioridade, number> = {
    alta: 0,
    media: 1,
    repor_estoque: 2,
    baixa: 3,
    sem_movimento: 4,
    sem_dado: 5,
  };
  candidatos.sort((a, b) =>
    ordem[a.prioridade] !== ordem[b.prioridade]
      ? ordem[a.prioridade] - ordem[b.prioridade]
      : (b.gmv_est_30d ?? -1) - (a.gmv_est_30d ?? -1),
  );

  const recomendados = candidatos.filter(
    (c) => c.prioridade === "alta" || c.prioridade === "media",
  );

  return {
    candidatos,
    gmvEstimadoRecomendado: recomendados.reduce((s, c) => s + (c.gmv_est_30d ?? 0), 0),
    itensRecomendados: recomendados.length,
    classes: CLASSES.map((c) => ({
      ...c,
      itens: candidatos.filter((x) => x.prioridade === c.chave).length,
    })),
    taxaConversao,
    ticketMedio,
    visitasTotais7d: candidatos.reduce((s, c) => s + (c.visitas_7d ?? 0), 0),
    dataReferencia: ref || null,
    dataReferenciaAnterior:
      candidatos.find((c) => c.visitas_7d_anterior !== null)?.visitas_7d_anterior !== undefined
        ? (datas.find((d) => diasEntre(ref, d) >= OFFSET_COMPARACAO - 7 && diasEntre(ref, d) <= OFFSET_COMPARACAO + 7) ?? null)
        : null,
  };
}
