import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SellerKPI } from "./useSellerData";

function transformDailyKpi(row: any, sellerNickname: string): SellerKPI {
  const gmv = Number(row.gmv_lc) || 0;
  const tgmv = Number(row.tgmv_lc) || 0;
  const invPads = Number(row.inv_pads) || 0;
  const tgmvPads = Number(row.tgmv_lc_pads) || 0;
  const tsiPads = Number(row.tsi_pads) || 0;
  const tgmvFull = Number(row.tgmv_lc_full) || 0;
  const tgmvFlex = Number(row.tgmv_lc_flex) || 0;
  const scorePhoto = Number(row.score_photo) || 0;
  const scoreTitle = Number(row.score_title) || 0;

  const roas = invPads > 0 ? tgmvPads / invPads : 0;
  const acos = tgmvPads > 0 ? (invPads / tgmvPads) * 100 : 0;
  const tacos = gmv > 0 ? (invPads / gmv) * 100 : 0;
  const cpa = tsiPads > 0 ? invPads / tsiPads : 0;

  const tsiTotal = Number(row.tsi) || 0;
  const tsiFull = Number(row.f_tsi) || 0;
  const tsiFlexVal = Number(row.tsi_flex) || 0;
  const pctFull = tsiTotal > 0 ? (tsiFull / tsiTotal) * 100 : 0;
  const pctFlex = tsiTotal > 0 ? (tsiFlexVal / tsiTotal) * 100 : 0;
  const pctPostagem = Math.max(0, 100 - pctFull - pctFlex);

  return {
    id: row.id,
    sellerId: row.seller_id,
    date: row.data,
    gmv,
    tsi: Number(row.tsi) || 0,
    tgmv,
    tgmvPads,
    revenue: gmv,
    adsInvestment: invPads,
    roas: Math.round(roas * 100) / 100,
    acos: Math.round(acos * 100) / 100,
    tacos: Math.round(tacos * 100) / 100,
    cpa: Math.round(cpa * 100) / 100,
    scorePhoto,
    scoreTitle,
    scoreOferta: Number(row.score_oferta_final) || 0,
    scoreCaracteristica: Number(row.score_caracteristica_final) || 0,
    repCancellationsRate: Number(row.rep_cancellations_rate) || 0,
    scoreFull: Number(row.score_final_full) || 0,
    scorePads: Number(row.score_final_pads) || 0,
    statusPhoto: scorePhoto < 70 ? "Revisar" : "OK",
    statusTitle: scoreTitle < 70 ? "Revisar" : "OK",
    llPicturesScore: Number(row.ll_pictures_score) || 0,
    llTitleScore: Number(row.ll_title_score) || 0,
    llTechSpecsScore: Number(row.ll_tech_specs_score) || 0,
    llDescriptionScore: Number(row.ll_description_score) || 0,
    llPriceScore: Number(row.ll_price_score) || 0,
    llStockAvailabilityScore: Number(row.ll_stock_availability_score) || 0,
    llFreeShippingScore: Number(row.ll_free_shipping_score) || 0,
    llPromotionsScore: Number(row.ll_promotions_score) || 0,
    sellersClipsPubli: Number(row.sellers_clips_publi) || 0,
    visitasClips: Number(row.visitas_clips) || 0,
    siClips: Number(row.si_clips) || 0,
    ordersClips: Number(row.orders_clips) || 0,
    tgmvLcClips: Number(row.tgmv_lc_clips) || 0,
    minPriceRival: Number(row.min_price_rival) || 0,
    visits: Number(row.visits) || 0,
    visitsExpensive: Number(row.visits_expensive) || 0,
    visitsMatch: Number(row.visits_match) || 0,
    visitsCheaper: Number(row.visits_cheaper) || 0,
    pctFull: Math.round(pctFull * 10) / 10,
    pctFlex: Math.round(pctFlex * 10) / 10,
    pctPostagem: Math.round(pctPostagem * 10) / 10,
    tgmvFull,
    tgmvFlex,
    upliftGmvM1: (() => {
      const gmvM1 = Number(row.gmv_lc_m1) || 0;
      if (gmvM1 > 0) return (gmv - gmvM1) / gmvM1;
      return 0;
    })(),
    gmvM1: Number(row.gmv_lc_m1) || 0,
    cdpTgmv: Number(row.cdp_tgmv_lc) || 0,
    repLevel: row.rep_current_level || "",
    repClaimsRate: Number(row.rep_claims_rate) || 0,
    repDelayedRate: Number(row.rep_delayed_ht_rate) || 0,
    pontuacaoLlGtin: Number(row.pontuacao_ll_gtin) || 0,
    pontuacaoIpi: Number(row.pontuacao_ipi) || 0,
    productName: sellerNickname,
    productId: row.seller_id,
  };
}

export function useSellerDailyKpis(sellerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["seller-kpis-daily", sellerId],
    queryFn: async (): Promise<SellerKPI[]> => {
      if (!sellerId) return [];

      // Query the daily table — not in generated types, use .from() with type assertion
      const { data, error } = await (supabase as any)
        .from("sellers_kpi_daily")
        .select("*, sellers!inner(nickname)")
        .eq("seller_id", sellerId)
        .order("data", { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return (data as any[]).map((row: any) =>
        transformDailyKpi(row, row.sellers?.nickname || "")
      );
    },
    enabled: !!sellerId && enabled,
  });
}
