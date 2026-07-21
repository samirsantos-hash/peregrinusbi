import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyAccess } from "@/hooks/useMyAccess";

export interface CarteiraDataset {
  cppDiario: any[];
  cppMensal: any[];
  cdpDiario: any[];
  cdpMensal: any[];
  liveListings: any[];
  elegibilidade: any[];
  baseVendedores: any[];
}

const PAGE = 1000;

async function fetchAll(table: string, allowedCustIds: string[] | null): Promise<any[]> {
  const out: any[] = [];
  let from = 0;
  // paginate; if allowedCustIds provided, filter (except admin sends null)
  while (true) {
    let q = (supabase as any).from(table).select("*").range(from, from + PAGE - 1);
    if (allowedCustIds && allowedCustIds.length > 0) {
      const nums = allowedCustIds.map((c) => Number(c)).filter((n) => Number.isFinite(n));
      if (nums.length > 0) q = q.in("cust_id", nums);
    }
    const { data, error } = await q;
    if (error) { console.warn(`[carteira] ${table}`, error.message); break; }
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
    if (from > 200000) break; // safety
  }
  return out;
}

export function useCarteiraData() {
  const { allowedCustIds, isAdmin, loading: accessLoading } = useMyAccess();
  const [data, setData] = useState<CarteiraDataset>({
    cppDiario: [], cppMensal: [], cdpDiario: [], cdpMensal: [],
    liveListings: [], elegibilidade: [], baseVendedores: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessLoading) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const scope = isAdmin ? null : allowedCustIds;
        const [cppD, cppM, cdpD, cdpM, ll, el, bv] = await Promise.all([
          fetchAll("cart_cpp_diarizado", scope),
          fetchAll("cart_cpp_mensal", scope),
          fetchAll("cart_cdp_diarizado", scope),
          fetchAll("cart_cdp_mensal", scope),
          fetchAll("cart_livelistings", scope),
          fetchAll("cart_elegibilidade", scope),
          fetchAll("cart_base_vendedores", scope),
        ]);
        if (!alive) return;
        setData({
          cppDiario: cppD, cppMensal: cppM, cdpDiario: cdpD, cdpMensal: cdpM,
          liveListings: ll, elegibilidade: el, baseVendedores: bv,
        });
      } catch (e: any) {
        if (alive) setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [accessLoading, isAdmin, allowedCustIds.join(",")]);

  return { data, loading, error };
}