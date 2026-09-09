import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  calcularEstatisticaRazoes,
  type EstatisticaRazoes,
  type UnidadeRazao,
} from "@/lib/ratioStats";

export interface VerticalStats {
  vertical: string;
  sellersCount: number;
  totalInv: number;
  totalTgmvPads: number;
  totalTgmv: number;
  /** mediana do investimento (sellers da vertical) */
  medianInv: number;
  medianRoas: number;
  medianAcos: number;
  medianTacos: number;
  /** @deprecated use medianInv */
  avgInv: number;
  /** @deprecated use medianRoas */
  avgRoas: number;
  /** @deprecated use medianAcos */
  avgAcos: number;
  /** @deprecated use medianTacos */
  avgTacos: number;
  /** estatística completa: agregado (razão dos totais), mediana e dispersão */
  stats: EstatisticaRazoes;
}

export interface PortfolioBenchmark {
  verticals: VerticalStats[];
  portfolio: {
    totalSellers: number;
    medianInv: number;
    medianRoas: number;
    medianAcos: number;
    medianTacos: number;
    /** @deprecated use medianInv */
    avgInv: number;
    /** @deprecated use medianRoas */
    avgRoas: number;
    /** @deprecated use medianAcos */
    avgAcos: number;
    /** @deprecated use medianTacos */
    avgTacos: number;
  };
  /** carteira inteira — agregados como razão dos totais + dispersão */
  stats: EstatisticaRazoes;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function usePortfolioBenchmark() {
  const [data, setData] = useState<PortfolioBenchmark | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all campaigns with verticals
        const { data: campaigns } = await supabase
          .from("meli_campaigns")
          .select("seller_id, vertical_principal")
          .not("vertical_principal", "is", null);

        if (!campaigns?.length) { setData(null); setLoading(false); return; }

        // Map seller -> vertical (latest)
        const sellerVertical: Record<string, string> = {};
        for (const c of campaigns) {
          if (c.vertical_principal) sellerVertical[c.seller_id] = c.vertical_principal;
        }

        const sellerIds = Object.keys(sellerVertical);

        // Find the latest month
        const { data: latestRow } = await supabase
          .from("sellers_kpi")
          .select("data")
          .order("data", { ascending: false })
          .limit(1);

        const latestMonth = latestRow?.[0]?.data || "2026-03-01";

        // Fetch KPIs for latest month only, in batches
        const PAGE = 500;
        let allKpis: any[] = [];
        for (let i = 0; i < sellerIds.length; i += PAGE) {
          const batch = sellerIds.slice(i, i + PAGE);
          const { data: kpis } = await supabase
            .from("sellers_kpi")
            .select("seller_id, inv_pads, tgmv_lc_pads, tgmv_lc")
            .in("seller_id", batch)
            .eq("data", latestMonth);
          if (kpis) allKpis = allKpis.concat(kpis);
        }

        // One row per seller for the month
        const sellerAgg: Record<string, { inv: number; tgmvPads: number; tgmv: number }> = {};
        for (const row of allKpis) {
          const inv = Number(row.inv_pads) || 0;
          const tgmvPads = Number(row.tgmv_lc_pads) || 0;
          const tgmv = Number(row.tgmv_lc) || 0;
          // For latest month, there should be one row per seller; accumulate just in case
          if (!sellerAgg[row.seller_id]) sellerAgg[row.seller_id] = { inv: 0, tgmvPads: 0, tgmv: 0 };
          sellerAgg[row.seller_id].inv += inv;
          sellerAgg[row.seller_id].tgmvPads += tgmvPads;
          sellerAgg[row.seller_id].tgmv += tgmv;
        }

        // Group by vertical
        const verticalMap: Record<string, { sellers: { inv: number; tgmvPads: number; tgmv: number }[] }> = {};
        for (const [sid, agg] of Object.entries(sellerAgg)) {
          const v = sellerVertical[sid];
          if (!v) continue;
          if (!verticalMap[v]) verticalMap[v] = { sellers: [] };
          verticalMap[v].sellers.push(agg);
        }

        const verticals: VerticalStats[] = Object.entries(verticalMap)
          .map(([vertical, { sellers }]) => {
            const totalInv = sellers.reduce((s, e) => s + e.inv, 0);
            const totalTgmvPads = sellers.reduce((s, e) => s + e.tgmvPads, 0);
            const totalTgmv = sellers.reduce((s, e) => s + e.tgmv, 0);

            // Mediana: apenas sellers com inv > 0 (alinhado a ratioStats)
            const comInv = sellers.filter((e) => e.inv > 0);
            const invValues = comInv.map((e) => e.inv);
            const roasValues = comInv.map((e) => e.tgmvPads / e.inv);
            const acosValues = comInv.filter((e) => e.tgmvPads > 0).map((e) => (e.inv / e.tgmvPads) * 100);
            const tacosValues = comInv.filter((e) => e.tgmv > 0).map((e) => (e.inv / e.tgmv) * 100);

            const medianInv = median(invValues);
            const medianRoas = median(roasValues);
            const medianAcos = median(acosValues);
            const medianTacos = median(tacosValues);

            return {
              vertical,
              sellersCount: sellers.length,
              totalInv,
              totalTgmvPads,
              totalTgmv,
              medianInv,
              medianRoas,
              medianAcos,
              medianTacos,
              avgInv: medianInv,
              avgRoas: medianRoas,
              avgAcos: medianAcos,
              avgTacos: medianTacos,
              stats: calcularEstatisticaRazoes(sellers as UnidadeRazao[]),
            };
          })
          .sort((a, b) => b.totalTgmv - a.totalTgmv);

        // Portfolio totals
        const allSellers = Object.values(sellerAgg);
        const pComInv = allSellers.filter((e) => e.inv > 0);
        const pInvValues = pComInv.map((e) => e.inv);
        const pRoasValues = pComInv.map((e) => e.tgmvPads / e.inv);
        const pAcosValues = pComInv.filter((e) => e.tgmvPads > 0).map((e) => (e.inv / e.tgmvPads) * 100);
        const pTacosValues = pComInv.filter((e) => e.tgmv > 0).map((e) => (e.inv / e.tgmv) * 100);

        const pMedianInv = median(pInvValues);
        const pMedianRoas = median(pRoasValues);
        const pMedianAcos = median(pAcosValues);
        const pMedianTacos = median(pTacosValues);

        setData({
          verticals,
          portfolio: {
            totalSellers: allSellers.length,
            medianInv: pMedianInv,
            medianRoas: pMedianRoas,
            medianAcos: pMedianAcos,
            medianTacos: pMedianTacos,
            avgInv: pMedianInv,
            avgRoas: pMedianRoas,
            avgAcos: pMedianAcos,
            avgTacos: pMedianTacos,
          },
          stats: calcularEstatisticaRazoes(allSellers as UnidadeRazao[]),
        });
      } catch (err) {
        console.error("Portfolio benchmark error:", err);
        setData(null);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return { data, loading };
}
