import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { transformKpi, type SellerKPI } from "@/hooks/useSellerData";

/** Colunas somáveis (volume/valor) */
const SUM_COLS = [
  "gmv_lc", "tsi", "tgmv_lc", "inv_pads", "tgmv_lc_pads", "tsi_pads",
  "tgmv_lc_full", "tgmv_lc_flex", "tsi_flex", "gmv_lc_m1", "cdp_tgmv_lc", "cdp_tsi",
  "visits", "visits_expensive", "visits_match", "visits_cheaper",
  "visitas_clips", "si_clips", "orders_clips", "tgmv_lc_clips", "sellers_clips_publi",
] as const;

/** Colunas de score/taxa (média simples entre lojas com valor) */
const AVG_COLS = [
  "score_photo", "score_title", "score_oferta_final", "score_caracteristica_final",
  "score_qualidade_final", "score_final_full", "score_final_pads",
  "rep_claims_rate", "rep_delayed_ht_rate", "rep_cancellations_rate",
  "pontuacao_ipi", "pontuacao_ll_gtin", "min_price_rival", "bpc",
  "ll_pictures_score", "ll_title_score", "ll_tech_specs_score", "ll_description_score",
  "ll_price_score", "ll_stock_availability_score", "ll_free_shipping_score", "ll_promotions_score",
] as const;

const SELECT = ["seller_id", "data", ...SUM_COLS, ...AVG_COLS].join(", ");

export interface LojaDiagnostico {
  sellerId: string;
  nickname: string;
  custId: string;
  gmv: number;
  urgencia: number;
  motivos: string[];
  acao: string;
}

export interface CarteiraConsolidado {
  kpis: SellerKPI[];
  lojas: LojaDiagnostico[];
  totalLojasComDado: number;
}

async function fetchAll(): Promise<any[]> {
  const page = 1000;

  // 1ª página + contagem total → demais páginas em paralelo (evita 8 idas sequenciais)
  const first = await supabase
    .from("sellers_kpi")
    .select(SELECT, { count: "exact" })
    .order("data", { ascending: true })
    .range(0, page - 1);
  if (first.error) throw first.error;

  const rows: any[] = [...(first.data || [])];
  const total = first.count ?? rows.length;
  const pages = Math.min(40, Math.ceil(total / page));
  if (pages <= 1) return rows;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, k) =>
      supabase
        .from("sellers_kpi")
        .select(SELECT)
        .order("data", { ascending: true })
        .range((k + 1) * page, (k + 2) * page - 1),
    ),
  );
  for (const r of rest) {
    if (r.error) throw r.error;
    rows.push(...(r.data || []));
  }
  return rows;
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Leitura consolidada da carteira do usuário (RLS decide o escopo).
 * Agrega sellers_kpi por mês somando volumes e mediando scores/taxas.
 */
export function useCarteiraConsolidado(
  sellers: { id: string; nickname: string; custId: string }[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["carteira-consolidado"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CarteiraConsolidado> => {
      const rows = await fetchAll();

      /* ---- agregação por mês ---- */
      const byDate = new Map<string, { sum: Record<string, number>; avg: Record<string, { s: number; n: number }> }>();
      const lastBySeller = new Map<string, any>();

      for (const r of rows) {
        const d = r.data as string;
        if (!d) continue;
        let bucket = byDate.get(d);
        if (!bucket) {
          bucket = { sum: {}, avg: {} };
          byDate.set(d, bucket);
        }
        for (const c of SUM_COLS) bucket.sum[c] = (bucket.sum[c] || 0) + num(r[c]);
        for (const c of AVG_COLS) {
          const v = Number(r[c]);
          if (Number.isFinite(v) && v !== 0) {
            const a = bucket.avg[c] || { s: 0, n: 0 };
            a.s += v; a.n += 1;
            bucket.avg[c] = a;
          }
        }
        const prev = lastBySeller.get(r.seller_id);
        if (!prev || String(prev.data) < d) lastBySeller.set(r.seller_id, r);
      }

      const kpis: SellerKPI[] = [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, b]) => {
          const row: any = { id: `cons-${date}`, seller_id: "consolidado", data: date };
          for (const c of SUM_COLS) row[c] = b.sum[c] || 0;
          for (const c of AVG_COLS) {
            const a = b.avg[c];
            row[c] = a && a.n > 0 ? a.s / a.n : null;
          }
          return transformKpi(row, "Carteira consolidada");
        });

      /* ---- diagnóstico por loja (último mês com dado) ---- */
      const meta = new Map(sellers.map((s) => [s.id, s]));
      const lojas: LojaDiagnostico[] = [];

      for (const [sellerId, r] of lastBySeller) {
        const info = meta.get(sellerId);
        if (!info) continue;
        const gmv = num(r.gmv_lc);
        const gmvM1 = num(r.gmv_lc_m1);
        const queda = gmvM1 > 0 ? (gmv - gmvM1) / gmvM1 : null;
        const invPads = num(r.inv_pads);
        const roas = invPads > 0 ? num(r.tgmv_lc_pads) / invPads : null;
        const atrasos = Number(r.rep_delayed_ht_rate);
        const reclam = Number(r.rep_claims_rate);
        const scoreFull = Number(r.score_final_full);

        const motivos: string[] = [];
        let urgencia = 0;

        if (num(r.tgmv_lc) === 0) {
          motivos.push("Sem faturamento no último mês");
          urgencia += 100;
        }
        if (queda !== null && queda <= -0.3) {
          motivos.push(`Queda de ${(queda * 100).toFixed(0)}% no faturamento vs. mês anterior`);
          urgencia += Math.min(80, Math.abs(queda) * 100);
        }
        if (Number.isFinite(atrasos) && atrasos > 0.05) {
          motivos.push(`Atrasos em ${(atrasos * 100).toFixed(1)}% dos envios`);
          urgencia += 40;
        }
        if (Number.isFinite(reclam) && reclam > 0.02) {
          motivos.push(`Reclamações em ${(reclam * 100).toFixed(1)}% dos pedidos`);
          urgencia += 30;
        }
        if (roas !== null && roas < 2) {
          motivos.push(`ROAS de ${roas.toFixed(2)}x em Ads`);
          urgencia += 25;
        }
        if (Number.isFinite(scoreFull) && scoreFull > 0 && scoreFull < 50) {
          motivos.push(`Nota de saúde da operação em ${scoreFull.toFixed(0)}`);
          urgencia += 20;
        }

        if (!motivos.length) continue;

        let acao = "Revisar plano de crescimento com o seller";
        if (num(r.tgmv_lc) === 0) acao = "Contato imediato — operação parada";
        else if (Number.isFinite(atrasos) && atrasos > 0.05) acao = "Tratar SLA de envio antes de escalar verba";
        else if (queda !== null && queda <= -0.3) acao = "Diagnóstico de queda: preço, estoque e visibilidade";
        else if (roas !== null && roas < 2) acao = "Rebalancear campanhas de Ads (ROAS abaixo de 2x)";
        else if (Number.isFinite(reclam) && reclam > 0.02) acao = "Plano de reputação: revisar pós-venda";

        lojas.push({
          sellerId,
          nickname: info.nickname,
          custId: info.custId,
          gmv,
          urgencia,
          motivos,
          acao,
        });
      }

      lojas.sort((a, b) => b.urgencia - a.urgencia || b.gmv - a.gmv);

      return { kpis, lojas, totalLojasComDado: lastBySeller.size };
    },
  });
}
