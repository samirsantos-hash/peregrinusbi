import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VerticalStats {
  vertical: string;
  sellersCount: number;
  totalInv: number;
  totalTgmvPads: number;
  totalTgmv: number;
  avgInv: number;
  avgRoas: number;
  avgAcos: number;
  avgTacos: number;
}

export interface PortfolioBenchmark {
  verticals: VerticalStats[];
  portfolio: {
    totalSellers: number;
    avgInv: number;
    avgRoas: number;
    avgAcos: number;
    avgTacos: number;
  };
}

export function usePortfolioBenchmark() {
  const [data, setData] = useState<PortfolioBenchmark | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
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

        // Fetch KPIs in batches
        const PAGE = 500;
        let allKpis: any[] = [];
        for (let i = 0; i < sellerIds.length; i += PAGE) {
          const batch = sellerIds.slice(i, i + PAGE);
          const { data: kpis } = await supabase
            .from("sellers_kpi")
            .select("seller_id, inv_pads, tgmv_lc_pads, tgmv_lc")
            .in("seller_id", batch);
          if (kpis) allKpis = allKpis.concat(kpis);
        }

        // Aggregate per seller
        const sellerAgg: Record<string, { inv: number; tgmvPads: number; tgmv: number }> = {};
        for (const row of allKpis) {
          const inv = Number(row.inv_pads) || 0;
          const tgmvPads = Number(row.tgmv_lc_pads) || 0;
          const tgmv = Number(row.tgmv_lc) || 0;
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
            return {
              vertical,
              sellersCount: sellers.length,
              totalInv,
              totalTgmvPads,
              totalTgmv,
              avgInv: sellers.length > 0 ? totalInv / sellers.length : 0,
              avgRoas: totalInv > 0 ? totalTgmvPads / totalInv : 0,
              avgAcos: totalTgmvPads > 0 ? (totalInv / totalTgmvPads) * 100 : 0,
              avgTacos: totalTgmv > 0 ? (totalInv / totalTgmv) * 100 : 0,
            };
          })
          .sort((a, b) => b.totalTgmv - a.totalTgmv);

        // Portfolio totals
        const allSellers = Object.values(sellerAgg);
        const pTotalInv = allSellers.reduce((s, e) => s + e.inv, 0);
        const pTotalTgmvPads = allSellers.reduce((s, e) => s + e.tgmvPads, 0);
        const pTotalTgmv = allSellers.reduce((s, e) => s + e.tgmv, 0);

        setData({
          verticals,
          portfolio: {
            totalSellers: allSellers.length,
            avgInv: allSellers.length > 0 ? pTotalInv / allSellers.length : 0,
            avgRoas: pTotalInv > 0 ? pTotalTgmvPads / pTotalInv : 0,
            avgAcos: pTotalTgmvPads > 0 ? (pTotalInv / pTotalTgmvPads) * 100 : 0,
            avgTacos: pTotalTgmv > 0 ? (pTotalInv / pTotalTgmv) * 100 : 0,
          },
        });
      } catch (err) {
        console.error("Portfolio benchmark error:", err);
        setData(null);
      }
      setLoading(false);
    };

    fetch();
  }, []);

  return { data, loading };
}
