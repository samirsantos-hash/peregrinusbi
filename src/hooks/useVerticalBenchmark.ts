import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type SellerCampaign } from "@/hooks/useMeliCampaigns";

export interface VerticalBenchmark {
  vertical: string;
  sellersCount: number;
  /** mediana do investimento por seller (não média) */
  medianInvestment: number;
  /** mediana das razões por seller com inv > 0 */
  medianRoas: number;
  medianAcos: number;
  medianTacos: number;
  /** @deprecated use medianInvestment */
  avgInvestment: number;
  /** @deprecated use medianRoas */
  avgRoas: number;
  /** @deprecated use medianAcos */
  avgAcos: number;
  /** @deprecated use medianTacos */
  avgTacos: number;
  totalInvestment: number;
  totalTgmvPads: number;
  totalTgmv: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useVerticalBenchmark(campaign: SellerCampaign | null) {
  const [benchmark, setBenchmark] = useState<VerticalBenchmark | null>(null);
  const [loading, setLoading] = useState(false);

  const vertical = campaign?.verticalPrincipal || null;

  useEffect(() => {
    if (!vertical) {
      setBenchmark(null);
      return;
    }

    const fetchBenchmark = async () => {
      setLoading(true);
      try {
        // 1. Get all seller_ids for this vertical from meli_campaigns
        const { data: campaignRows, error: cErr } = await supabase
          .from("meli_campaigns")
          .select("seller_id")
          .eq("vertical_principal", vertical);

        if (cErr || !campaignRows?.length) {
          setBenchmark(null);
          setLoading(false);
          return;
        }

        const sellerIds = [...new Set(campaignRows.map((r) => r.seller_id))];

        // 2. Find the latest month available
        const { data: latestRow } = await supabase
          .from("sellers_kpi")
          .select("data")
          .order("data", { ascending: false })
          .limit(1);

        const latestMonth = latestRow?.[0]?.data || "2026-03-01";

        // 3. Fetch KPIs for the latest month only
        const PAGE = 500;
        let allKpis: any[] = [];
        for (let i = 0; i < sellerIds.length; i += PAGE) {
          const batch = sellerIds.slice(i, i + PAGE);
          const { data } = await supabase
            .from("sellers_kpi")
            .select("seller_id, inv_pads, tgmv_lc_pads, tgmv_lc")
            .in("seller_id", batch)
            .eq("data", latestMonth);
          if (data) allKpis = allKpis.concat(data);
        }

        // 4. One row per seller for the latest month
        const sellerData: { inv: number; tgmvPads: number; tgmv: number }[] = [];
        for (const row of allKpis) {
          const inv = Number(row.inv_pads) || 0;
          const tgmvPads = Number(row.tgmv_lc_pads) || 0;
          const tgmv = Number(row.tgmv_lc) || 0;
          if (inv === 0 && tgmvPads === 0 && tgmv === 0) continue;
          sellerData.push({ inv, tgmvPads, tgmv });
        }

        if (sellerData.length === 0) {
          setBenchmark(null);
          setLoading(false);
          return;
        }

        const totalInv = sellerData.reduce((s, e) => s + e.inv, 0);
        const totalTgmvPads = sellerData.reduce((s, e) => s + e.tgmvPads, 0);
        const totalTgmv = sellerData.reduce((s, e) => s + e.tgmv, 0);

        // Mediana das razões — apenas sellers com investimento > 0 (alinhado a ratioStats)
        const comInv = sellerData.filter((e) => e.inv > 0);
        const invValues = comInv.map((e) => e.inv);
        const roasValues = comInv.map((e) => e.tgmvPads / e.inv);
        const acosValues = comInv.filter((e) => e.tgmvPads > 0).map((e) => (e.inv / e.tgmvPads) * 100);
        const tacosValues = comInv.filter((e) => e.tgmv > 0).map((e) => (e.inv / e.tgmv) * 100);

        const medianInvestment = median(invValues);
        const medianRoas = median(roasValues);
        const medianAcos = median(acosValues);
        const medianTacos = median(tacosValues);

        setBenchmark({
          vertical,
          sellersCount: sellerData.length,
          medianInvestment,
          medianRoas,
          medianAcos,
          medianTacos,
          avgInvestment: medianInvestment,
          avgRoas: medianRoas,
          avgAcos: medianAcos,
          avgTacos: medianTacos,
          totalInvestment: totalInv,
          totalTgmvPads,
          totalTgmv,
        });
      } catch (err) {
        console.error("Vertical benchmark error:", err);
        setBenchmark(null);
      }
      setLoading(false);
    };

    fetchBenchmark();
  }, [vertical]);

  return { benchmark, loading };
}
