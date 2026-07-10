import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildBpcThresholds } from "@/lib/risk/bpcThresholds";
import { buildChurnStats, type SellerMonthTriplet } from "@/lib/risk/churnRisk";
import {
  aggregateRisk,
  type RiskSellerInput,
  type RiskSellerResult,
} from "@/lib/risk/riskAggregator";
import { fetchDominantVerticals } from "@/lib/risk/verticalOf";

export interface RiskPanelData {
  results: RiskSellerResult[];
  months: { current: string; closed: string; prior: string };
  totals: { alta: number; media: number; total: number };
}

/**
 * Constrói o painel F8. Usa RLS (só lê as lojas do usuário).
 * Enquanto o mês corrente estiver parcial, snapshots (BPC/Reputação) e baseline
 * de churn usam o último mês fechado.
 */
export function useSellerRiskPanel() {
  return useQuery({
    queryKey: ["seller-risk-panel"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RiskPanelData | null> => {
      const { data: monthsRows, error: mErr } = await supabase
        .from("sellers_kpi")
        .select("data")
        .order("data", { ascending: false })
        .limit(1);
      if (mErr) throw mErr;
      if (!monthsRows || monthsRows.length === 0) return null;
      // sellers_kpi.data é sempre o 1º dia do mês; derivamos os 2 meses anteriores.
      const currentDate = new Date(String(monthsRows[0].data));
      const toIso = (d: Date) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
      const shift = (d: Date, n: number) =>
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
      const current = toIso(currentDate);
      const closed = toIso(shift(currentDate, -1));
      const prior = toIso(shift(currentDate, -2));
      const distinct = [current, closed, prior];

      const { data: kpis, error: kErr } = await supabase
        .from("sellers_kpi")
        .select(
          "seller_id, data, tgmv_lc, bpc, rep_claims_rate, rep_delayed_ht_rate, sellers!inner(id, nickname, cust_id)",
        )
        .in("data", [current, closed, prior]);
      if (kErr) throw kErr;

      const verticalOf = await fetchDominantVerticals();

      type Snap = {
        sellerId: string;
        custId: string;
        nickname: string;
        currentTgmv: number;
        closedTgmv: number;
        priorTgmv: number;
        closedBpc: number | null;
        closedClaims: number | null;
        closedDelayed: number | null;
      };
      const bySeller: Record<string, Snap> = {};
      for (const row of (kpis || []) as any[]) {
        const sid = String(row.seller_id);
        const nickname = row.sellers?.nickname || "—";
        const custId = String(row.sellers?.cust_id || "");
        const s = (bySeller[sid] ||= {
          sellerId: sid,
          custId,
          nickname,
          currentTgmv: 0,
          closedTgmv: 0,
          priorTgmv: 0,
          closedBpc: null,
          closedClaims: null,
          closedDelayed: null,
        });
        const tgmv = Number(row.tgmv_lc) || 0;
        const dataStr = String(row.data);
        if (dataStr === current) s.currentTgmv = tgmv;
        else if (dataStr === closed) {
          s.closedTgmv = tgmv;
          s.closedBpc = row.bpc == null ? null : Number(row.bpc);
          s.closedClaims = Number(row.rep_claims_rate) || 0;
          s.closedDelayed = Number(row.rep_delayed_ht_rate) || 0;
        } else if (dataStr === prior) s.priorTgmv = tgmv;
      }

      const ativos = Object.values(bySeller).filter((s) => s.closedTgmv > 0);

      const bpcBySeller: Record<string, number> = {};
      for (const s of ativos) if (s.closedBpc != null) bpcBySeller[s.sellerId] = s.closedBpc;
      const bpcModel = buildBpcThresholds(bpcBySeller, verticalOf);

      const triplets: SellerMonthTriplet[] = ativos.map((s) => ({
        sellerId: s.sellerId,
        current: s.currentTgmv,
        closed: s.closedTgmv,
        prior: s.priorTgmv,
      }));
      const churnStats = buildChurnStats(triplets, verticalOf);

      const inputs: RiskSellerInput[] = ativos.map((s) => ({
        sellerId: s.sellerId,
        custId: s.custId,
        nickname: s.nickname,
        vertical: verticalOf[s.sellerId] || null,
        bpc: s.closedBpc,
        repClaimsRate: s.closedClaims,
        repDelayedRate: s.closedDelayed,
        gmvClosed: s.closedTgmv,
        triplet: {
          sellerId: s.sellerId,
          current: s.currentTgmv,
          closed: s.closedTgmv,
          prior: s.priorTgmv,
        },
      }));

      const results = aggregateRisk(inputs, bpcModel, churnStats);
      return {
        results,
        months: { current, closed, prior },
        totals: {
          alta: results.filter((r) => r.severity === "alta").length,
          media: results.filter((r) => r.severity === "media").length,
          total: results.length,
        },
      };
    },
  });
}