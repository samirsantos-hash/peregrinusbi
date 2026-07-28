import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyAccess } from "@/hooks/useMyAccess";

export interface CarteiraSeller {
  id: string; custId: string; nick: string; uf: string; regiao: string;
  cluster: string | null; vertical: string | null;
}
export interface CarteiraPoint {
  sellerId: string; data: string;
  gmv: number; tsi: number; visitas: number;
  invPads: number; gmvPads: number; tsiPads: number;
}
export interface CarteiraListing {
  sellerId: string; data: string; categoria: string; vertical: string; itens: number;
}
export interface CarteiraElig {
  sellerId: string; itemId: string; itemName: string;
  descontoTotal: number; descontoSeller: number; optIn: boolean;
  pedidos7d: number; tsiDiario: number; campaignType: string;
}
export interface CarteiraGrant {
  sellerId: string; custId: string; expiracao: string; dias: number; url: string | null;
}

export interface CarteiraDataset {
  sellers: CarteiraSeller[];
  sellerById: Map<string, CarteiraSeller>;
  daily: CarteiraPoint[];
  monthly: CarteiraPoint[];
  listings: CarteiraListing[];
  eligibility: CarteiraElig[];
  grants: CarteiraGrant[];
  refDate: string | null;
}

const REGIAO: Record<string, string> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

const PAGE = 1000;

async function page<T = any>(build: () => any, max = 120): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const { data, error } = await build().range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) { console.warn("[carteira]", error.message); break; }
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const EMPTY: CarteiraDataset = {
  sellers: [], sellerById: new Map(), daily: [], monthly: [],
  listings: [], eligibility: [], grants: [], refDate: null,
};

export function useCarteiraData() {
  const { allowedCustIds, isAdmin, loading: accessLoading } = useMyAccess();
  const [data, setData] = useState<CarteiraDataset>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopeKey = isAdmin ? "*" : allowedCustIds.join(",");

  useEffect(() => {
    if (accessLoading) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rawSellers = await page(() =>
          supabase.from("sellers").select("id, cust_id, nickname, cus_state, cluster_seller, vertical_dominant")
        );
        const allow = isAdmin ? null : new Set(allowedCustIds.map(String));
        const sellers: CarteiraSeller[] = rawSellers
          .filter((s: any) => !allow || allow.has(String(s.cust_id)))
          .map((s: any) => {
            const uf = (s.cus_state || "").toUpperCase().trim() || "ND";
            return {
              id: s.id, custId: String(s.cust_id), nick: s.nickname || String(s.cust_id),
              uf, regiao: REGIAO[uf] || "ND",
              cluster: s.cluster_seller ?? null, vertical: s.vertical_dominant ?? null,
            };
          });
        const ids = new Set(sellers.map((s) => s.id));

        const since = isoDaysAgo(60);
        const kpiCols = "seller_id, data, tgmv_lc, tsi, visits, inv_pads, tgmv_lc_pads, tsi_pads";

        // última data de elegibilidade
        const { data: lastElig } = await supabase
          .from("seller_eligibility").select("data").order("data", { ascending: false }).limit(1);
        const eligDate = lastElig?.[0]?.data ?? null;

        const [rawDaily, rawMonthly, rawListings, rawElig, rawGrants] = await Promise.all([
          page(() => supabase.from("sellers_kpi_daily").select(kpiCols).gte("data", since).order("data")),
          page(() => supabase.from("sellers_kpi").select(kpiCols).order("data")),
          page(() => supabase.from("live_listings").select("seller_id, data, categoria, vertical, itens")),
          eligDate
            ? page(() => supabase.from("seller_eligibility")
                .select("seller_id, item_id, item_name, discount_total, discount_seller_percentage, flag_item_s_optin, pedidos_7d, media_tsi_diario_7d, campaign_type")
                .eq("data", eligDate))
            : Promise.resolve([] as any[]),
          page(() => supabase.from("seller_grants").select("seller_id, cust_id, expiration_date, days_to_expire, salesforce_url")),
        ]);

        if (!alive) return;

        const mapPoint = (r: any): CarteiraPoint => ({
          sellerId: r.seller_id, data: r.data,
          gmv: num(r.tgmv_lc), tsi: num(r.tsi), visitas: num(r.visits),
          invPads: num(r.inv_pads), gmvPads: num(r.tgmv_lc_pads), tsiPads: num(r.tsi_pads),
        });

        const daily = rawDaily.filter((r: any) => ids.has(r.seller_id)).map(mapPoint);
        const monthly = rawMonthly.filter((r: any) => ids.has(r.seller_id)).map(mapPoint);
        const listings: CarteiraListing[] = rawListings
          .filter((r: any) => ids.has(r.seller_id))
          .map((r: any) => ({
            sellerId: r.seller_id, data: r.data,
            categoria: r.categoria || r.vertical || "ND",
            vertical: r.vertical || "ND", itens: num(r.itens),
          }));
        const eligibility: CarteiraElig[] = rawElig
          .filter((r: any) => ids.has(r.seller_id))
          .map((r: any) => ({
            sellerId: r.seller_id, itemId: String(r.item_id), itemName: r.item_name || "",
            // discount_* são armazenados em basis points (×100)
            descontoTotal: num(r.discount_total) / 100,
            descontoSeller: num(r.discount_seller_percentage) / 100,
            optIn: !!r.flag_item_s_optin,
            pedidos7d: num(r.pedidos_7d), tsiDiario: num(r.media_tsi_diario_7d),
            campaignType: r.campaign_type || "ND",
          }));
        const grants: CarteiraGrant[] = rawGrants
          .filter((r: any) => ids.has(r.seller_id))
          .map((r: any) => ({
            sellerId: r.seller_id, custId: String(r.cust_id),
            expiracao: r.expiration_date, dias: num(r.days_to_expire), url: r.salesforce_url ?? null,
          }));

        const refDate = daily.length ? daily[daily.length - 1].data : eligDate;

        setData({
          sellers, sellerById: new Map(sellers.map((s) => [s.id, s])),
          daily, monthly, listings, eligibility, grants, refDate,
        });
      } catch (e: any) {
        if (alive) setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [accessLoading, isAdmin, scopeKey]);

  const hasData = useMemo(
    () => data.daily.length + data.monthly.length + data.listings.length > 0,
    [data]
  );

  return { data, loading, error, hasData };
}
