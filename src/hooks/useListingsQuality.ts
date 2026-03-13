import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ListingQuality {
  id: string;
  sellerId: string;
  itemId: string;
  date: string;
  llPicturesScore: number;
  llTitleScore: number;
  llTechSpecsScore: number;
  llDescriptionScore: number;
  llPriceScore: number;
  llStockAvailabilityScore: number;
  llFreeShippingScore: number;
  llPromotionsScore: number;
  scorePhoto: number;
  scoreTitle: number;
  scoreOfertaFinal: number;
  scoreCaracteristicaFinal: number;
  /** @deprecated Use repCancellationsRate from seller KPIs instead */
  scoreQualidadeFinal: number;
  sellersClipsPubli: number;
  visitasClips: number;
  siClips: number;
  ordersClips: number;
  tgmvLcClips: number;
  /** Computed average of all LL scores */
  avgScore: number;
  /** List of dimensions below threshold */
  issues: string[];
  mlbLink: string;
}

function buildMlbLink(itemId: string): string {
  const clean = itemId.replace(/\D/g, "");
  return `https://produto.mercadolivre.com.br/MLB-${clean}`;
}

function getIssues(row: any): string[] {
  const issues: string[] = [];
  const n = (v: any) => Number(v) || 0;
  if (n(row.ll_pictures_score) < 70 && n(row.ll_pictures_score) > 0) issues.push("Melhorar Fotos");
  if (n(row.ll_title_score) < 70 && n(row.ll_title_score) > 0) issues.push("Ajustar Título");
  if (n(row.ll_tech_specs_score) < 70 && n(row.ll_tech_specs_score) > 0) issues.push("Preencher Ficha Técnica");
  if (n(row.ll_description_score) < 70 && n(row.ll_description_score) > 0) issues.push("Melhorar Descrição");
  if (n(row.ll_price_score) < 70 && n(row.ll_price_score) > 0) issues.push("Revisar Preço");
  if (n(row.ll_free_shipping_score) < 70 && n(row.ll_free_shipping_score) > 0) issues.push("Ativar Frete Grátis");
  if (n(row.ll_promotions_score) < 70 && n(row.ll_promotions_score) > 0) issues.push("Criar Promoções");
  return issues;
}

export function useListingsQuality(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["listings-quality", sellerId],
    queryFn: async (): Promise<ListingQuality[]> => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from("seller_listings_quality")
        .select("*")
        .eq("seller_id", sellerId)
        .order("data", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Keep only latest per item_id
      const latestMap = new Map<string, any>();
      for (const row of data) {
        if (!latestMap.has(row.item_id)) {
          latestMap.set(row.item_id, row);
        }
      }

      return Array.from(latestMap.values()).map((row) => {
        const n = (v: any) => Number(v) || 0;
        const scores = [
          n(row.ll_pictures_score), n(row.ll_title_score),
          n(row.ll_tech_specs_score), n(row.ll_description_score),
          n(row.ll_price_score), n(row.ll_free_shipping_score),
          n(row.ll_promotions_score),
        ].filter((s) => s > 0);

        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

        return {
          id: row.id,
          sellerId: row.seller_id,
          itemId: row.item_id,
          date: row.data,
          llPicturesScore: n(row.ll_pictures_score),
          llTitleScore: n(row.ll_title_score),
          llTechSpecsScore: n(row.ll_tech_specs_score),
          llDescriptionScore: n(row.ll_description_score),
          llPriceScore: n(row.ll_price_score),
          llStockAvailabilityScore: n(row.ll_stock_availability_score),
          llFreeShippingScore: n(row.ll_free_shipping_score),
          llPromotionsScore: n(row.ll_promotions_score),
          scorePhoto: n(row.score_photo),
          scoreTitle: n(row.score_title),
          scoreOfertaFinal: n(row.score_oferta_final),
          scoreCaracteristicaFinal: n(row.score_caracteristica_final),
          scoreQualidadeFinal: n(row.score_qualidade_final),
          sellersClipsPubli: n(row.sellers_clips_publi),
          visitasClips: n(row.visitas_clips),
          siClips: n(row.si_clips),
          ordersClips: n(row.orders_clips),
          tgmvLcClips: n(row.tgmv_lc_clips),
          avgScore,
          issues: getIssues(row),
          mlbLink: buildMlbLink(row.item_id),
        };
      });
    },
    enabled: !!sellerId,
  });
}
