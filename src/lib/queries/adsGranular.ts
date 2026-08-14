import type { SupabaseClient } from "@supabase/supabase-js";

export type Granularidade = "dia" | "semana" | "mes" | "trimestre";

export const GRANULARIDADES: { val: Granularidade; label: string }[] = [
  { val: "dia", label: "Diário" },
  { val: "semana", label: "Semanal" },
  { val: "mes", label: "Mensal" },
  { val: "trimestre", label: "Trimestral" },
];

export type BucketAds = {
  key: string;
  label: string;
  inv: number;
  gmv_ads: number;
  gmv_total: number;
  tsi_ads: number;
  roas: number;
  acos: number;
  tacos: number;
};

export type ProdutoAds = {
  item_id: string;
  item_name: string;
  pedidos_7d: number;
  tsi_dia: number;
  desconto_total: number;
  em_campanha: boolean;
  data: string;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Chave + rótulo do bucket para uma data ISO (YYYY-MM-DD), sempre em UTC. */
export function bucketDe(dataIso: string, g: Granularidade): { key: string; label: string } {
  const [y, m, d] = dataIso.slice(0, 10).split("-").map(Number);
  if (g === "dia") {
    return { key: dataIso.slice(0, 10), label: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}` };
  }
  if (g === "mes") {
    return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${MESES[m - 1]}/${String(y).slice(2)}` };
  }
  if (g === "trimestre") {
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `T${q}/${String(y).slice(2)}` };
  }
  // semana: segunda-feira da semana
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = segunda
  dt.setUTCDate(dt.getUTCDate() - dow);
  const key = dt.toISOString().slice(0, 10);
  return {
    key,
    label: `sem ${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}

/** Série de investimento em Ads agregada por granularidade, a partir de sellers_kpi_daily. */
export async function getSerieAdsGranular(
  supabase: SupabaseClient,
  params: { sellerUuid: string; fromDate: string; toDate: string; granularidade: Granularidade },
): Promise<BucketAds[]> {
  const { sellerUuid, fromDate, toDate, granularidade } = params;
  const { data } = await supabase
    .from("sellers_kpi_daily")
    .select("data, inv_pads, tgmv_lc, tgmv_lc_pads, tsi_pads")
    .eq("seller_id", sellerUuid)
    .gte("data", fromDate)
    .lte("data", toDate)
    .order("data", { ascending: true })
    .limit(5000);

  const mapa = new Map<string, BucketAds>();
  for (const r of data ?? []) {
    const iso = String((r as any).data ?? "").slice(0, 10);
    if (!iso) continue;
    const { key, label } = bucketDe(iso, granularidade);
    const b =
      mapa.get(key) ??
      { key, label, inv: 0, gmv_ads: 0, gmv_total: 0, tsi_ads: 0, roas: 0, acos: 0, tacos: 0 };
    b.inv += num((r as any).inv_pads);
    b.gmv_ads += num((r as any).tgmv_lc_pads);
    b.gmv_total += num((r as any).tgmv_lc);
    b.tsi_ads += num((r as any).tsi_pads);
    mapa.set(key, b);
  }

  return [...mapa.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((b) => ({
      ...b,
      roas: b.inv > 0 ? b.gmv_ads / b.inv : 0,
      acos: b.gmv_ads > 0 ? (b.inv / b.gmv_ads) * 100 : 0,
      tacos: b.gmv_total > 0 ? (b.inv / b.gmv_total) * 100 : 0,
    }));
}

/**
 * Produtos mais vendidos no período (seller_eligibility).
 * Mantém a leitura mais recente de cada item dentro do intervalo.
 */
export async function getTopProdutosAds(
  supabase: SupabaseClient,
  params: { sellerUuid: string; fromDate: string; toDate: string; limite?: number },
): Promise<ProdutoAds[]> {
  const { sellerUuid, fromDate, toDate, limite = 20 } = params;
  const { data } = await supabase
    .from("seller_eligibility")
    .select("item_id, item_name, pedidos_7d, media_tsi_diario_7d, discount_total, flag_item_s_optin, data")
    .eq("seller_id", sellerUuid)
    .gte("data", fromDate)
    .lte("data", toDate)
    .order("data", { ascending: true })
    .limit(5000);

  const mapa = new Map<string, ProdutoAds>();
  for (const r of data ?? []) {
    const id = String((r as any).item_id ?? "");
    if (!id) continue;
    mapa.set(id, {
      item_id: id,
      item_name: String((r as any).item_name ?? id),
      pedidos_7d: num((r as any).pedidos_7d),
      tsi_dia: num((r as any).media_tsi_diario_7d),
      desconto_total: num((r as any).discount_total) / 10,
      em_campanha: Boolean((r as any).flag_item_s_optin),
      data: String((r as any).data ?? "").slice(0, 10),
    });
  }

  return [...mapa.values()].sort((a, b) => b.pedidos_7d - a.pedidos_7d).slice(0, limite);
}
