import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Seller {
  id: string;
  nickname: string;
  custId: string;
  cluster?: string;
  subCluster?: string;
  state?: string;
}

export interface SellerKPI {
  id: string;
  sellerId: string;
  date: string;
  // Efficiency / GMV
  gmv: number;
  tsi: number;
  tgmv: number;
  revenue: number;
  adsInvestment: number;
  roas: number;
  acos: number;
  tacos: number;
  cpa: number;
  // Quality
  scorePhoto: number;
  scoreTitle: number;
  scoreOferta: number;
  scoreCaracteristica: number;
  scoreQualidade: number;
  scoreFull: number;
  scorePads: number;
  statusPhoto: string;
  statusTitle: string;
  // Competitiveness
  minPriceRival: number;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  // Logistics
  pctFull: number;
  pctFlex: number;
  pctPostagem: number;
  tgmvFull: number;
  tgmvFlex: number;
  // Projection
  upliftGmvM1: number;
  gmvM1: number;
  // CDP
  cdpTgmv: number;
  // Reputation
  repLevel: string;
  repClaimsRate: number;
  repDelayedRate: number;
  // For compatibility with product-based panels
  productName: string;
  productId: string;
}

function transformKpi(row: any, sellerNickname: string): SellerKPI {
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

  const totalLogistics = tgmvFull + tgmvFlex;
  const pctFull = tgmv > 0 ? (tgmvFull / tgmv) * 100 : 0;
  const pctFlex = tgmv > 0 ? (tgmvFlex / tgmv) * 100 : 0;
  const pctPostagem = Math.max(0, 100 - pctFull - pctFlex);

  return {
    id: row.id,
    sellerId: row.seller_id,
    date: row.data,
    gmv,
    tsi: Number(row.tsi) || 0,
    tgmv,
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
    scoreQualidade: Number(row.score_qualidade_final) || 0,
    scoreFull: Number(row.score_final_full) || 0,
    scorePads: Number(row.score_final_pads) || 0,
    statusPhoto: scorePhoto < 70 ? "Revisar" : "OK",
    statusTitle: scoreTitle < 70 ? "Revisar" : "OK",
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
    // uplift is stored as absolute value — convert to growth rate
    upliftGmvM1: (() => {
      const gmvM1 = Number(row.gmv_lc_m1) || 0;
      const currentGmv = Number(row.gmv_lc) || 0;
      if (gmvM1 > 0) return (currentGmv - gmvM1) / gmvM1;
      return 0;
    })(),
    gmvM1: Number(row.gmv_lc_m1) || 0,
    cdpTgmv: Number(row.cdp_tgmv_lc) || 0,
    repLevel: row.rep_current_level || "",
    repClaimsRate: Number(row.rep_claims_rate) || 0,
    repDelayedRate: Number(row.rep_delayed_ht_rate) || 0,
    // Use seller nickname + date as "product" since real data is per-seller
    productName: sellerNickname,
    productId: row.seller_id,
  };
}

export function useSellers() {
  return useQuery({
    queryKey: ["sellers"],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, nickname, cust_id, cluster_seller, sub_cluster_seller, cus_state")
        .order("nickname");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((s) => ({
        id: s.id,
        nickname: s.nickname,
        custId: s.cust_id,
        cluster: s.cluster_seller || undefined,
        subCluster: s.sub_cluster_seller || undefined,
        state: s.cus_state || undefined,
      }));
    },
  });
}

export function useSellerKpis(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["seller-kpis", sellerId],
    queryFn: async (): Promise<SellerKPI[]> => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from("sellers_kpi")
        .select("*, sellers!inner(nickname)")
        .eq("seller_id", sellerId)
        .order("data", { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) =>
        transformKpi(row, row.sellers?.nickname || "")
      );
    },
    enabled: !!sellerId,
  });
}

export function getDiagnostic(kpi: SellerKPI) {
  const alerts: { icon: string; label: string; severity: "critical" | "warning" | "success" }[] = [];

  if (kpi.scorePhoto > 0 && kpi.scorePhoto < 70) alerts.push({ icon: "📸", label: "Melhorar Fotos", severity: "critical" });
  if (kpi.scoreTitle > 0 && kpi.scoreTitle < 70) alerts.push({ icon: "❌", label: "Ajustar SEO", severity: "critical" });
  if (kpi.roas > 0 && kpi.roas < 2) alerts.push({ icon: "💸", label: "Revisar Verba Ads", severity: "warning" });

  if (kpi.minPriceRival > 0 && kpi.visits > 0) {
    // Use visits_expensive / visits as proxy for price competitiveness
    const pctExpensive = kpi.visitsExpensive / kpi.visits;
    if (pctExpensive > 0.3) alerts.push({ icon: "💰", label: "Preço não Competitivo", severity: "warning" });
  }

  if (alerts.length === 0) alerts.push({ icon: "🏆", label: "Anúncio Campeão", severity: "success" });

  return alerts;
}
