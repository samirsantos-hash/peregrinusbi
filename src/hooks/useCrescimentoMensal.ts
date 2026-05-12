import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthKeyFromTimMonthId } from "@/lib/dates";
import type { SerieMensal } from "@/lib/forecast";

export interface PontoMensal {
  mes: string;
  receita: number;
  visitas: number;
  tsi: number;
  invAds: number;
  cr: number; // %
  aov: number;
  sellersAtivos: number;
}

export interface CrescimentoMensalResult {
  pontos: PontoMensal[];
  receita: SerieMensal;
  visitas: SerieMensal;
  cr: SerieMensal;
  aov: SerieMensal;
  invAds: SerieMensal;
}

function toNum(x: any): number {
  if (x == null) return 0;
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function useCrescimentoMensal(custIds?: string[]) {
  return useQuery({
    queryKey: ["crescimento-mensal", custIds?.sort().join(",") || "all"],
    queryFn: async (): Promise<CrescimentoMensalResult> => {
      let q = supabase
        .from("cpp_mensal")
        .select("tim_month_id, mes_ref, cus_cust_id_sel, tgmv_lc, tsi, visitas, inv_pads")
        .not("tgmv_lc", "is", null);
      if (custIds && custIds.length > 0) {
        q = q.in("cus_cust_id_sel", custIds.map((c) => Number(c)).filter((n) => Number.isFinite(n)));
      }
      const { data, error } = await q;
      if (error) throw error;

      const byMonth = new Map<string, PontoMensal>();
      const sellersByMonth = new Map<string, Set<string>>();

      (data ?? []).forEach((row: any) => {
        const key = row.mes_ref ? String(row.mes_ref).slice(0, 7) : monthKeyFromTimMonthId(row.tim_month_id);
        if (!key || key.length !== 7) return;
        const cur = byMonth.get(key) ?? { mes: key, receita: 0, visitas: 0, tsi: 0, invAds: 0, cr: 0, aov: 0, sellersAtivos: 0 };
        const r = toNum(row.tgmv_lc);
        cur.receita += r;
        cur.visitas += toNum(row.visitas);
        cur.tsi += toNum(row.tsi);
        cur.invAds += toNum(row.inv_pads);
        byMonth.set(key, cur);
        if (r > 0 && row.cus_cust_id_sel != null) {
          const set = sellersByMonth.get(key) ?? new Set<string>();
          set.add(String(row.cus_cust_id_sel));
          sellersByMonth.set(key, set);
        }
      });

      const pontos = Array.from(byMonth.values())
        .map((p) => ({
          ...p,
          cr: p.visitas > 0 ? (p.tsi / p.visitas) * 100 : 0,
          aov: p.tsi > 0 ? p.receita / p.tsi : 0,
          sellersAtivos: sellersByMonth.get(p.mes)?.size ?? 0,
        }))
        .sort((a, b) => (a.mes < b.mes ? -1 : 1));

      return {
        pontos,
        receita: pontos.map((p) => ({ mes: p.mes, valor: p.receita })),
        visitas: pontos.map((p) => ({ mes: p.mes, valor: p.visitas })),
        cr: pontos.map((p) => ({ mes: p.mes, valor: p.cr })),
        aov: pontos.map((p) => ({ mes: p.mes, valor: p.aov })),
        invAds: pontos.map((p) => ({ mes: p.mes, valor: p.invAds })),
      };
    },
    staleTime: 60_000,
  });
}