import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EligibilityItem {
  id: string;
  sellerId: string;
  itemId: string;
  itemName: string;
  discountBest: number;
  discountTotal: number;
  discountSellerPercentage: number;
  flagItemSOptin: boolean;
  flagBestPromo: boolean;
  acaoRecomendada: string;
  estoqueMedio7d: number;
  estoqueMedioFull7d: number;
  pedidos7d: number;
  mediaTsiDiario7d: number;
  campaignType: string;
  verticalItem: string;
  domDomainAgg1: string;
  campaignIdBest: string;
  data: string;
  mlbLink: string;
  gainAttractiveness: number;
  alert: string | null;
}

export function useEligibility(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["eligibility", sellerId],
    queryFn: async (): Promise<EligibilityItem[]> => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from("seller_eligibility" as any)
        .select("*")
        .eq("seller_id", sellerId)
        .order("pedidos_7d", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return (data as any[]).map((row) => {
        const discountBest = Number(row.discount_best) || 0;
        const discountTotal = Number(row.discount_total) || 0;
        const discountSellerPct = Number(row.discount_seller_percentage) || 0;
        const estoque = Number(row.estoque_medio_7d) || 0;
        const pedidos = Number(row.pedidos_7d) || 0;
        const mediaTsi = Number(row.media_tsi_diario_7d) || 0;
        const campaignType = String(row.campaign_type || "");
        const flagOptin = Boolean(row.flag_item_s_optin);
        const cleanItemId = String(row.item_id).replace(/\D/g, "");

        let alert: string | null = null;
        if (estoque < 5 && pedidos > 10) {
          alert = "🚨 Risco de Ruptura: Reabastecer Urgente";
        } else if (flagOptin && pedidos > 5) {
          alert = "🔥 Prioridade de Ativação";
        }

        return {
          id: row.id,
          sellerId: row.seller_id,
          itemId: row.item_id,
          itemName: row.item_name || "",
          discountBest,
          discountTotal,
          discountSellerPercentage: discountSellerPct,
          flagItemSOptin: flagOptin,
          flagBestPromo: Boolean(row.flag_best_promo),
          acaoRecomendada: row.acao_recomendada || "",
          estoqueMedio7d: estoque,
          estoqueMedioFull7d: Number(row.estoque_medio_full_7d) || 0,
          pedidos7d: pedidos,
          mediaTsiDiario7d: mediaTsi,
          campaignType,
          verticalItem: row.vertical_item || "",
          domDomainAgg1: row.dom_domain_agg1 || "",
          campaignIdBest: row.campaign_id_best || "",
          data: row.data,
          mlbLink: cleanItemId ? `https://produto.mercadolivre.com.br/MLB-${cleanItemId}` : "",
          gainAttractiveness: Math.round((discountBest - discountTotal) * 100) / 100,
          alert,
        };
      });
    },
    enabled: !!sellerId,
  });
}
