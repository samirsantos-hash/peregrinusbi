import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SellerCampaign {
  sellerId: string;
  verticalPrincipal: string | null;
  efectRtaVertical: number;
  taxaConversaoVertical: number;
}

export function useMeliCampaigns(sellerIds: string[]) {
  const [campaigns, setCampaigns] = useState<Record<string, SellerCampaign>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sellerIds.length) {
      setCampaigns({});
      return;
    }

    const fetch = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("meli_campaigns" as any)
        .select("seller_id, vertical_principal, efect_rta_vertical, taxa_conversao_vertical, data")
        .in("seller_id", sellerIds)
        .order("data", { ascending: false });

      if (error) {
        console.error("Error fetching meli_campaigns:", error);
        setLoading(false);
        return;
      }

      // Take latest record per seller
      const map: Record<string, SellerCampaign> = {};
      for (const row of (data as any[]) || []) {
        if (!map[row.seller_id]) {
          let efect = Number(row.efect_rta_vertical) || 0;
          let txConv = Number(row.taxa_conversao_vertical) || 0;
          // Normalize: if stored as decimal (e.g. 1.099 means 109.9%), convert to percentage
          if (efect > 0 && efect < 10) efect = efect * 100;
          if (txConv > 0 && txConv < 1) txConv = txConv * 100;
          map[row.seller_id] = {
            sellerId: row.seller_id,
            verticalPrincipal: row.vertical_principal || null,
            efectRtaVertical: efect,
            taxaConversaoVertical: txConv,
          };
        }
      }

      setCampaigns(map);
      setLoading(false);
    };

    fetch();
  }, [sellerIds.join(",")]);

  return { campaigns, loading };
}

/**
 * Badge de efetividade.
 * Se `stat` (μ±z·σ da vertical) for fornecido, usa cortes estatísticos por vertical
 * (com fallback global embutido pelo `useVerticalThresholds`).
 * Caso contrário, cai para cortes universais 70 / 100 (compatibilidade).
 */
export function getEffectivenessBadge(
  efectRta: number,
  stat?: { mean: number; sd: number; low: number; high: number; source: "vertical" | "global" },
): { label: string; className: string; scope: "vertical" | "global" | "fixed" } {
  if (stat && stat.sd > 0) {
    const scope = stat.source;
    if (efectRta >= stat.high) return { label: "Líder de Vertical", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", scope };
    if (efectRta < stat.low) return { label: "Abaixo do Mercado", className: "bg-red-500/20 text-red-300 border-red-500/30", scope };
    return { label: "Na média", className: "bg-blue-500/20 text-blue-300 border-blue-500/30", scope };
  }
  if (efectRta >= 100) return { label: "Líder de Vertical", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", scope: "fixed" };
  if (efectRta >= 70) return { label: "Alta Performance", className: "bg-blue-500/20 text-blue-300 border-blue-500/30", scope: "fixed" };
  return { label: "Abaixo do Mercado", className: "bg-red-500/20 text-red-300 border-red-500/30", scope: "fixed" };
}
