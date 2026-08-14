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
const CONCURRENCY = 6;

/** Paginação em lotes paralelos — reduz drasticamente o tempo vs. round-trips sequenciais. */
async function page<T = any>(build: () => any, max = 120): Promise<T[]> {
  const out: T[] = [];
  let start = 0;
  while (start < max) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, max - start) }, (_, k) => start + k);
    const res = await Promise.all(
      batch.map((i) => build().range(i * PAGE, i * PAGE + PAGE - 1))
    );
    let done = false;
    for (const { data, error } of res as any[]) {
      if (error) { console.warn("[carteira]", error.message); done = true; break; }
      if (!data?.length) { done = true; break; }
      out.push(...(data as T[]));
      if (data.length < PAGE) { done = true; break; }
    }
    if (done) break;
    start += batch.length;
  }
  return out;
}

/** Cache em memória por escopo — evita refetch ao trocar de aba/carteira. */
const CACHE = new Map<string, CarteiraDataset>();

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

export function useCarteiraData(custIdsFilter?: string[], enabled = true) {
  const { allowedCustIds, isAdmin, loading: accessLoading } = useMyAccess();
  const [data, setData] = useState<CarteiraDataset>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopeKey = isAdmin ? "*" : allowedCustIds.join(",");
  const filterKey = custIdsFilter ? custIdsFilter.join(",") : "";

  useEffect(() => {
    if (accessLoading || !enabled) return;
    const cacheKey = `${scopeKey}|${filterKey}`;
    const cached = CACHE.get(cacheKey);
    if (cached) { setData(cached); setLoading(false); setError(null); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rawSellers = await page(() =>
          supabase.from("sellers").select("id, cust_id, nickname, cus_state, cluster_seller, vertical_dominant")
        );
        const allow = isAdmin ? null : new Set(allowedCustIds.map(String));
        const only = custIdsFilter?.length ? new Set(custIdsFilter.map(String)) : null;
        const normUf = (v: any) => {
          const raw = String(v ?? "").toUpperCase().trim();
          const m = raw.match(/([A-Z]{2})$/); // aceita "SP" e "BR-SP"
          return m ? m[1] : "ND";
        };
        const sellers: CarteiraSeller[] = rawSellers
          .filter((s: any) => (!allow || allow.has(String(s.cust_id))) && (!only || only.has(String(s.cust_id))))
          .map((s: any) => {
            const uf = normUf(s.cus_state);
            return {
              id: s.id, custId: String(s.cust_id), nick: s.nickname || String(s.cust_id),
              uf, regiao: REGIAO[uf] || "ND",
              cluster: s.cluster_seller ?? null, vertical: s.vertical_dominant ?? null,
            };
          });
        const ids = new Set(sellers.map((s) => s.id));
        const idList = [...ids];
        // Filtro server-side quando a carteira é pequena (evita trazer a rede inteira)
        const scoped = <B extends { in: (c: string, v: any[]) => B }>(q: B): B =>
          idList.length > 0 && idList.length <= 300 ? q.in("seller_id", idList) : q;

        const since = isoDaysAgo(60);
        const kpiCols = "seller_id, data, tgmv_lc, tsi, visits, inv_pads, tgmv_lc_pads, tsi_pads";

        // última data de elegibilidade
        const { data: lastElig } = await supabase
          .from("seller_eligibility").select("data").order("data", { ascending: false }).limit(1);
        const eligDate = lastElig?.[0]?.data ?? null;

        const [rawDaily, rawMonthly, rawListings, rawElig, rawGrants] = await Promise.all([
          page(() => scoped(supabase.from("sellers_kpi_daily").select(kpiCols).gte("data", since).order("data") as any)),
          page(() => scoped(supabase.from("sellers_kpi").select(kpiCols).gte("data", isoDaysAgo(400)).order("data") as any)),
          page(() => scoped(supabase.from("live_listings").select("seller_id, data, categoria, vertical, dom_domain_agg1, itens") as any)),
          eligDate
            ? page(() => scoped(supabase.from("seller_eligibility")
                .select("seller_id, item_id, item_name, discount_total, discount_seller_percentage, flag_item_s_optin, pedidos_7d, media_tsi_diario_7d, campaign_type")
                .eq("data", eligDate) as any))
            : Promise.resolve([] as any[]),
          page(() => scoped(supabase.from("seller_grants").select("seller_id, cust_id, expiration_date, days_to_expire, salesforce_url") as any)),
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
            // `categoria` na base traz sazonalidade (VERÃO/INVERNO) — a categoria real é dom_domain_agg1
            categoria: r.dom_domain_agg1 || r.vertical || "ND",
            vertical: r.vertical || "ND", itens: num(r.itens),
          }));
        const eligibility: CarteiraElig[] = rawElig
          .filter((r: any) => ids.has(r.seller_id))
          .map((r: any) => ({
            sellerId: r.seller_id, itemId: String(r.item_id), itemName: r.item_name || "",
            // discount_* são armazenados em décimos de ponto percentual (×10): 30 = 3%
            descontoTotal: num(r.discount_total) / 10,
            descontoSeller: num(r.discount_seller_percentage) / 10,
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

        const next: CarteiraDataset = {
          sellers, sellerById: new Map(sellers.map((s) => [s.id, s])),
          daily, monthly, listings, eligibility, grants, refDate,
        };
        CACHE.set(cacheKey, next);
        setData(next);
      } catch (e: any) {
        if (alive) setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [accessLoading, isAdmin, scopeKey, filterKey, enabled]);

  const hasData = useMemo(
    () => data.daily.length + data.monthly.length + data.listings.length > 0,
    [data]
  );

  return { data, loading, error, hasData };
}
