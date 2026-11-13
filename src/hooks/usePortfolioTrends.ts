import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellerTrend {
  sellerId: string;
  tgmvTrend: number; // positive = growth, negative = decline (percentage)
  visitsTrend: number;
  adsTrend: number;
}

export function usePortfolioTrends(sellerIds: string[]) {
  const [trends, setTrends] = useState<Record<string, SellerTrend>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!sellerIds.length) {
      setTrends({});
      setLoading(false);
      return;
    }

    const fetchTrends = async () => {
      setLoading(true);

      // Preserve the existing observed-date halves; aggregate in Cloud instead
      // of downloading full daily histories (and silently stopping at 1000).
      const { data, error } = await supabase.rpc("indicadores_tendencias", { p_seller_ids: sellerIds });
      if (error) { if (alive) { setTrends({}); setLoading(false); } return; }
      const result: Record<string, SellerTrend> = {};
      for (const row of data ?? []) {
        result[row.seller_id] = { sellerId: row.seller_id, tgmvTrend: Number(row.tgmv_trend),
          visitsTrend: Number(row.visits_trend), adsTrend: Number(row.ads_trend) };
      }
      if (!alive) return;
      setTrends(result);
      setLoading(false);
    };

    fetchTrends();
    return () => { alive = false; };
  }, [sellerIds.join(",")]);

  return { trends, loading };
}
