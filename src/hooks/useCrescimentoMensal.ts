import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthKey, monthKeyFromTimMonthId } from "@/lib/dates";
import type { SerieMensal } from "@/lib/forecast";
import { detectPartialMonths } from "@/utils/partialPeriodGuard";

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
  mesesParciais: string[];
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
      // Primary source: cpp_mensal (when populated). Fallback to sellers_kpi (daily) aggregated by month.
      const byMonth = new Map<string, PontoMensal>();
      const sellersByMonth = new Map<string, Set<string>>();

      // 1) Try cpp_mensal first
      let cppQ = supabase
        .from("cpp_mensal")
        .select("tim_month_id, mes_ref, cus_cust_id_sel, tgmv_lc, tsi, visitas, inv_pads")
        .not("tgmv_lc", "is", null);
      if (custIds && custIds.length > 0) {
        cppQ = cppQ.in("cus_cust_id_sel", custIds.map((c) => Number(c)).filter((n) => Number.isFinite(n)));
      }
      const { data: cppRows } = await cppQ;

      if (cppRows && cppRows.length > 0) {
        cppRows.forEach((row: any) => {
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
      } else {
        // 2) Fallback: aggregate sellers_kpi (daily) by month
        // Pull in pages to bypass 1000-row limit
        const pageSize = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: kpiRows, error } = await supabase
            .from("sellers_kpi")
            .select("seller_id, data, tim_month_id, tgmv_lc, gmv_lc, tsi, visits, inv_pads")
            .order("data", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!kpiRows || kpiRows.length === 0) break;
          kpiRows.forEach((row: any) => {
            const key = row.tim_month_id
              ? monthKeyFromTimMonthId(row.tim_month_id)
              : (row.data ? monthKey(row.data) : "");
            if (!key || key.length !== 7) return;
            const cur = byMonth.get(key) ?? { mes: key, receita: 0, visitas: 0, tsi: 0, invAds: 0, cr: 0, aov: 0, sellersAtivos: 0 };
            const r = toNum(row.tgmv_lc) || toNum(row.gmv_lc);
            cur.receita += r;
            cur.visitas += toNum(row.visits);
            cur.tsi += toNum(row.tsi);
            cur.invAds += toNum(row.inv_pads);
            byMonth.set(key, cur);
            if (r > 0 && row.seller_id) {
              const set = sellersByMonth.get(key) ?? new Set<string>();
              set.add(String(row.seller_id));
              sellersByMonth.set(key, set);
            }
          });
          if (kpiRows.length < pageSize) break;
          from += pageSize;
        }
      }

      const pontosFull = Array.from(byMonth.values())
        .map((p) => ({
          ...p,
          cr: p.visitas > 0 ? (p.tsi / p.visitas) * 100 : 0,
          aov: p.tsi > 0 ? p.receita / p.tsi : 0,
          sellersAtivos: sellersByMonth.get(p.mes)?.size ?? 0,
        }))
        .sort((a, b) => (a.mes < b.mes ? -1 : 1));

      // Drop partial months (incomplete data — would distort forecast / MoM / slope)
      const partialInfo = detectPartialMonths(
        pontosFull.map((p) => ({ date: `${p.mes}-01`, gmv: p.receita })),
        { thresholdPct: 0.5 },
      );
      const mesesParciais = pontosFull
        .filter((p) => partialInfo.get(p.mes)?.isPartial)
        .map((p) => p.mes);
      const parciaisSet = new Set(mesesParciais);
      const pontos = pontosFull.filter((p) => !parciaisSet.has(p.mes));

      return {
        pontos,
        receita: pontos.map((p) => ({ mes: p.mes, valor: p.receita })),
        visitas: pontos.map((p) => ({ mes: p.mes, valor: p.visitas })),
        cr: pontos.map((p) => ({ mes: p.mes, valor: p.cr })),
        aov: pontos.map((p) => ({ mes: p.mes, valor: p.aov })),
        invAds: pontos.map((p) => ({ mes: p.mes, valor: p.invAds })),
        mesesParciais,
      };
    },
    staleTime: 60_000,
  });
}