import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { monthKey, monthKeyFromTimMonthId } from "@/lib/dates";
import { classificarCrescimento, type ClassificacaoSust } from "@/lib/sustentabilidade";
import { decompor } from "@/lib/decomposicao";
import { inclinacaoLog, type SerieMensal } from "@/lib/forecast";

export interface LojaClassificada {
  sellerId: string;
  custId: string;
  nickname: string;
  cluster: string;
  subCluster: string;
  tier: 1 | 2 | 3;
  classificacao: ClassificacaoSust;
  cor: string;
  frase: string;
  argumentos: {
    receitaPct3m: number;
    visitasPct3m: number;
    crPp3m: number;
    aovPct3m: number;
    invAdsPct3m: number;
    slope6m: number;
  };
  receitaUlt: number;
  meses: number;
}

function toNum(x: any): number {
  if (x == null) return 0;
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function pctChange(serie: SerieMensal, lastN = 3): number {
  const data = serie.filter((p) => p.valor != null) as { mes: string; valor: number }[];
  if (data.length < lastN + 1) return 0;
  const cur = data[data.length - 1].valor;
  const prev = data[data.length - 1 - lastN].valor;
  return prev === 0 ? 0 : ((cur - prev) / prev) * 100;
}
function ppChange(serie: SerieMensal, lastN = 3): number {
  const data = serie.filter((p) => p.valor != null) as { mes: string; valor: number }[];
  if (data.length < lastN + 1) return 0;
  return data[data.length - 1].valor - data[data.length - 1 - lastN].valor;
}

export function useClassificacaoLojas() {
  return useQuery({
    queryKey: ["classificacao-lojas"],
    queryFn: async (): Promise<LojaClassificada[]> => {
      // 1) sellers metadata
      const { data: sellers, error: sErr } = await supabase
        .from("sellers")
        .select("id, cust_id, nickname, cluster_seller, sub_cluster_seller");
      if (sErr) throw sErr;
      const meta = new Map(
        (sellers ?? []).map((s: any) => [
          s.id as string,
          { custId: s.cust_id as string, nickname: s.nickname as string, cluster: s.cluster_seller ?? "—", subCluster: s.sub_cluster_seller ?? "—" },
        ]),
      );

      // 2) sellers_kpi paged
      type Row = { seller_id: string; data: string | null; tim_month_id: number | null; tgmv_lc: any; gmv_lc: any; tsi: any; visits: any; inv_pads: any };
      const all: Row[] = [];
      const pageSize = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("sellers_kpi")
          .select("seller_id, data, tim_month_id, tgmv_lc, gmv_lc, tsi, visits, inv_pads")
          .order("data", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // 3) group by seller -> month
      const bySeller = new Map<string, Map<string, { receita: number; visitas: number; tsi: number; invAds: number }>>();
      all.forEach((r) => {
        const key = r.tim_month_id ? monthKeyFromTimMonthId(r.tim_month_id) : (r.data ? monthKey(r.data) : "");
        if (!key || key.length !== 7 || !r.seller_id) return;
        const m = bySeller.get(r.seller_id) ?? new Map();
        const cur = m.get(key) ?? { receita: 0, visitas: 0, tsi: 0, invAds: 0 };
        cur.receita += toNum(r.tgmv_lc) || toNum(r.gmv_lc);
        cur.visitas += toNum(r.visits);
        cur.tsi += toNum(r.tsi);
        cur.invAds += toNum(r.inv_pads);
        m.set(key, cur);
        bySeller.set(r.seller_id, m);
      });

      // 4) classify each seller
      const result: LojaClassificada[] = [];
      bySeller.forEach((months, sellerId) => {
        const info = meta.get(sellerId);
        if (!info) return;
        const sorted = Array.from(months.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
        if (sorted.length < 4) return;
        const receita: SerieMensal = sorted.map(([mes, v]) => ({ mes, valor: v.receita }));
        const visitas: SerieMensal = sorted.map(([mes, v]) => ({ mes, valor: v.visitas }));
        const cr: SerieMensal = sorted.map(([mes, v]) => ({ mes, valor: v.visitas > 0 ? (v.tsi / v.visitas) * 100 : 0 }));
        const aov: SerieMensal = sorted.map(([mes, v]) => ({ mes, valor: v.tsi > 0 ? v.receita / v.tsi : 0 }));
        const invAds: SerieMensal = sorted.map(([mes, v]) => ({ mes, valor: v.invAds }));

        const last = sorted[sorted.length - 1][1];
        const prev3 = sorted[Math.max(0, sorted.length - 4)][1];
        const decomp = decompor(
          { receita: last.receita, visitas: last.visitas, cr: cr[cr.length - 1].valor as number, aov: aov[aov.length - 1].valor as number },
          { receita: prev3.receita, visitas: prev3.visitas, cr: prev3.visitas > 0 ? (prev3.tsi / prev3.visitas) * 100 : 0, aov: prev3.tsi > 0 ? prev3.receita / prev3.tsi : 0 },
        );
        const sust = classificarCrescimento({ receita, visitas, cr, aov, invAds, decomp });

        result.push({
          sellerId,
          custId: info.custId,
          nickname: info.nickname,
          cluster: info.cluster,
          subCluster: info.subCluster,
          classificacao: sust.classificacao,
          cor: sust.cor,
          frase: sust.frase,
          argumentos: {
            receitaPct3m: pctChange(receita),
            visitasPct3m: pctChange(visitas),
            crPp3m: ppChange(cr),
            aovPct3m: pctChange(aov),
            invAdsPct3m: pctChange(invAds),
            slope6m: inclinacaoLog(receita, 6),
          },
          receitaUlt: last.receita,
          meses: sorted.length,
        });
      });

      return result.sort((a, b) => b.receitaUlt - a.receitaUlt);
    },
    staleTime: 60_000,
  });
}