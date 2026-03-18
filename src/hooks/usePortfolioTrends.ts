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
    if (!sellerIds.length) {
      setTrends({});
      setLoading(false);
      return;
    }

    const fetchTrends = async () => {
      setLoading(true);

      // Get last 30 days of daily data
      const { data } = await supabase
        .from("sellers_kpi_daily")
        .select("seller_id, data, tgmv_lc, visits, inv_pads")
        .in("seller_id", sellerIds)
        .order("data", { ascending: true });

      if (!data || data.length === 0) {
        setTrends({});
        setLoading(false);
        return;
      }

      // Find date range and split in half
      const dates = [...new Set(data.map((d) => d.data))].sort();
      const midIdx = Math.floor(dates.length / 2);
      const firstHalfDates = new Set(dates.slice(0, midIdx));
      const secondHalfDates = new Set(dates.slice(midIdx));

      // Group by seller
      const bySeller: Record<string, { first: { tgmv: number; visits: number; ads: number }; second: { tgmv: number; visits: number; ads: number } }> = {};

      for (const row of data) {
        if (!bySeller[row.seller_id]) {
          bySeller[row.seller_id] = {
            first: { tgmv: 0, visits: 0, ads: 0 },
            second: { tgmv: 0, visits: 0, ads: 0 },
          };
        }
        const bucket = firstHalfDates.has(row.data) ? "first" : secondHalfDates.has(row.data) ? "second" : null;
        if (bucket) {
          bySeller[row.seller_id][bucket].tgmv += Number(row.tgmv_lc) || 0;
          bySeller[row.seller_id][bucket].visits += Number(row.visits) || 0;
          bySeller[row.seller_id][bucket].ads += Number(row.inv_pads) || 0;
        }
      }

      const result: Record<string, SellerTrend> = {};
      for (const [sid, buckets] of Object.entries(bySeller)) {
        const pct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
        result[sid] = {
          sellerId: sid,
          tgmvTrend: pct(buckets.second.tgmv, buckets.first.tgmv),
          visitsTrend: pct(buckets.second.visits, buckets.first.visits),
          adsTrend: pct(buckets.second.ads, buckets.first.ads),
        };
      }

      setTrends(result);
      setLoading(false);
    };

    fetchTrends();
  }, [sellerIds.join(",")]);

  return { trends, loading };
}
