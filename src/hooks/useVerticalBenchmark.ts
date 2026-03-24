import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type SellerCampaign } from "@/hooks/useMeliCampaigns";

export interface VerticalBenchmark {
  vertical: string;
  sellersCount: number;
  avgInvestment: number;
  avgRoas: number;
  avgAcos: number;
  avgTacos: number;
  totalInvestment: number;
  totalTgmvPads: number;
  totalTgmv: number;
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

        // 2. Fetch latest monthly KPIs for these sellers (aggregate)
        // Use paginated fetch to avoid URL limits
        const PAGE = 500;
        let allKpis: any[] = [];
        for (let i = 0; i < sellerIds.length; i += PAGE) {
          const batch = sellerIds.slice(i, i + PAGE);
          const { data } = await supabase
            .from("sellers_kpi")
            .select("seller_id, inv_pads, tgmv_lc_pads, tgmv_lc")
            .in("seller_id", batch);
          if (data) allKpis = allKpis.concat(data);
        }

        // 3. Aggregate per seller (sum across all months)
        const sellerAgg: Record<string, { inv: number; tgmvPads: number; tgmv: number }> = {};
        for (const row of allKpis) {
          const inv = Number(row.inv_pads) || 0;
          const tgmvPads = Number(row.tgmv_lc_pads) || 0;
          const tgmv = Number(row.tgmv_lc) || 0;
          if (inv === 0 && tgmvPads === 0 && tgmv === 0) continue;
          if (!sellerAgg[row.seller_id]) sellerAgg[row.seller_id] = { inv: 0, tgmvPads: 0, tgmv: 0 };
          sellerAgg[row.seller_id].inv += inv;
          sellerAgg[row.seller_id].tgmvPads += tgmvPads;
          sellerAgg[row.seller_id].tgmv += tgmv;
        }

        const entries = Object.values(sellerAgg).filter((e) => e.inv > 0 || e.tgmvPads > 0);
        if (entries.length === 0) {
          setBenchmark(null);
          setLoading(false);
          return;
        }

        const totalInv = entries.reduce((s, e) => s + e.inv, 0);
        const totalTgmvPads = entries.reduce((s, e) => s + e.tgmvPads, 0);
        const totalTgmv = entries.reduce((s, e) => s + e.tgmv, 0);

        setBenchmark({
          vertical,
          sellersCount: entries.length,
          avgInvestment: totalInv / entries.length,
          avgRoas: totalInv > 0 ? totalTgmvPads / totalInv : 0,
          avgAcos: totalTgmvPads > 0 ? (totalInv / totalTgmvPads) * 100 : 0,
          avgTacos: totalTgmv > 0 ? (totalInv / totalTgmv) * 100 : 0,
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
