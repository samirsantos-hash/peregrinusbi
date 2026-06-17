import type { EligibilityItem } from "@/hooks/useEligibility";

export type CampanhaItem = {
  item_id: string;
  item_name: string;
  vertical: string;
  campaign_id: string;
  campaign_type: string;
  discount_total: number;
  discount_seller: number;
  discount_ml: number;
  pct_ml: number;
  best_campaign_id: string;
  discount_best: number;
  pode_melhorar: boolean;
  optin: boolean;
  flag_best_promo: boolean;
  pedidos_7d: number;
  estoque: number;
  cofinanciada: boolean;
  peso_algo: number;
};

export type CampanhaPortfolio = {
  itens: CampanhaItem[];
  cofinanciadas_com_optin: number;
  cofinanciadas_sem_optin: number;
  pode_melhorar: number;
  por_tipo: Record<string, { count: number; ml_medio: number; seller_medio: number }>;
};

export const PESO_CAMPANHA: Record<string, number> = {
  PRENEGOTIATED: 5,
  COMMERCIAL: 4,
  PRICE_MATCHING: 4,
  PRICE_MATCHING_MELI_ALL: 4,
  SMART_COFINANCED: 3,
  TIER_1: 2,
  TIER_3: 2,
  LIGHTNING: 1,
  DOD: 1,
  UNHEALTHY_STOCK: 1,
};

export const LABEL_CAMPANHA: Record<string, string> = {
  PRENEGOTIATED: "Pré-negociada",
  COMMERCIAL: "Comercial",
  PRICE_MATCHING: "Price Matching",
  PRICE_MATCHING_MELI_ALL: "Price Matching (ML)",
  SMART_COFINANCED: "Smart Cofinanciada",
  TIER_1: "Tier 1",
  TIER_3: "Tier 3",
  LIGHTNING: "Relâmpago",
  DOD: "Deal of the Day",
  UNHEALTHY_STOCK: "Estoque Excedente",
};

export const COR_PESO: Record<number, string> = {
  5: "#a78bfa",
  4: "#818cf8",
  3: "#22d3ee",
  2: "#94a3b8",
  1: "#475569",
};

/**
 * Transforma EligibilityItem[] em uma visão de campanhas de promoção,
 * deduplicando por item_id (mantém o registro com maior desconto total).
 * Observação: o schema atual de seller_eligibility não expõe um campaign_id
 * "ativo" separado — usamos campaign_id_best como código de referência e
 * campaign_type como o tipo ativo.
 */
export function buildCampanhasCofinanciadas(items: EligibilityItem[]): CampanhaPortfolio {
  // Dedup por item_id
  const byId = new Map<string, EligibilityItem>();
  for (const it of items) {
    const k = String(it.itemId);
    const prev = byId.get(k);
    if (!prev || (it.discountTotal || 0) > (prev.discountTotal || 0)) byId.set(k, it);
  }

  const itens: CampanhaItem[] = Array.from(byId.values())
    .filter((r) => r.campaignType || r.campaignIdBest)
    .map((r) => {
      const disc_total = Number(r.discountTotal) || 0;
      const disc_seller = Number(r.discountSellerPercentage) || 0;
      const disc_ml = Math.max(0, disc_total - disc_seller);
      const pct_ml = disc_total > 0 ? (disc_ml / disc_total) * 100 : 0;
      const tipo = (r.campaignType || "").toUpperCase();
      const disc_best = Number(r.discountBest) || 0;

      return {
        item_id: String(r.itemId),
        item_name: r.itemName || "",
        vertical: r.verticalItem || r.domDomainAgg1 || "",
        campaign_id: r.campaignIdBest || "",
        campaign_type: tipo,
        discount_total: disc_total,
        discount_seller: disc_seller,
        discount_ml: disc_ml,
        pct_ml,
        best_campaign_id: r.campaignIdBest || "",
        discount_best: disc_best,
        pode_melhorar: disc_best > disc_total + 0.5,
        optin: !r.flagItemSOptin,
        flag_best_promo: Boolean(r.flagBestPromo),
        pedidos_7d: Number(r.pedidos7d) || 0,
        estoque: Number(r.estoqueMedio7d) || 0,
        cofinanciada: disc_ml > 0,
        peso_algo: PESO_CAMPANHA[tipo] ?? 1,
      };
    });

  const por_tipo: CampanhaPortfolio["por_tipo"] = {};
  for (const item of itens) {
    const key = item.campaign_type || "—";
    if (!por_tipo[key]) por_tipo[key] = { count: 0, ml_medio: 0, seller_medio: 0 };
    por_tipo[key].count++;
    por_tipo[key].ml_medio += item.discount_ml;
    por_tipo[key].seller_medio += item.discount_seller;
  }
  for (const k of Object.keys(por_tipo)) {
    const c = por_tipo[k].count || 1;
    por_tipo[k].ml_medio /= c;
    por_tipo[k].seller_medio /= c;
  }

  const sorted = itens.sort((a, b) => {
    if (a.cofinanciada !== b.cofinanciada) return a.cofinanciada ? -1 : 1;
    if (a.optin !== b.optin) return a.optin ? 1 : -1;
    if (b.peso_algo !== a.peso_algo) return b.peso_algo - a.peso_algo;
    return b.pedidos_7d - a.pedidos_7d;
  });

  return {
    itens: sorted,
    cofinanciadas_com_optin: itens.filter((i) => i.cofinanciada && i.optin).length,
    cofinanciadas_sem_optin: itens.filter((i) => i.cofinanciada && !i.optin).length,
    pode_melhorar: itens.filter((i) => i.pode_melhorar).length,
    por_tipo,
  };
}