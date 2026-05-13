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
  tierFonte: "reputacao" | "metricas" | "receita";
  tierByRep: 1 | 2 | 3 | null;
  tierByMetricas: 1 | 2 | 3 | null;
  repLevel: string | null;
  metricas: {
    sowPadsPct: number;   // inv_pads / tgmv_lc * 100
    oosPct: number;       // 100 - ll_stock_availability_score
    bsPct: number;        // rep_cancellations_rate * 100 (proxy de Bad Seller)
  };
  tierChecks: {
    sowPads: "ok" | "fail" | "na";
    oos: "ok" | "fail" | "na";
    bs: "ok" | "fail" | "na";
    rep: "ok" | "fail" | "na";
  };
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
  visitasUlt: number;
  crUlt: number;
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

/* ---- Critérios oficiais Marketplace (vendedor por tier) ----
   Tier 1 (green_platinum): %SoW Pads ≥ 2.5, %OOS ≤ 15, %BS ≤ 35
   Tier 2 (green_gold):     %SoW Pads ≥ 1.25, %OOS ≤ 25, %BS ≤ 45
   Tier 3 (green_silver):   %SoW Pads ≥ 0.5, %OOS ≤ 35, %BS ≤ 55
   Obs.: %3PGM não está em sellers_kpi (vive em cpp_mensal) — exibido só quando disponível.
----------------------------------------------------------------- */
export const TIER_THRESHOLDS = {
  1: { sowPads: 2.5, oos: 15, bs: 35, rep: "green_platinum" },
  2: { sowPads: 1.25, oos: 25, bs: 45, rep: "green_gold" },
  3: { sowPads: 0.5, oos: 35, bs: 55, rep: "green_silver" },
} as const;

function repLevelToTier(level: string | null): 1 | 2 | 3 | null {
  if (!level) return null;
  const k = level.toLowerCase();
  if (k.includes("platinum")) return 1;
  if (k.includes("gold")) return 2;
  if (k.includes("silver")) return 3;
  return null;
}

function tierFromMetricas(sow: number, oos: number, bs: number): 1 | 2 | 3 {
  if (sow >= TIER_THRESHOLDS[1].sowPads && oos <= TIER_THRESHOLDS[1].oos && bs <= TIER_THRESHOLDS[1].bs) return 1;
  if (sow >= TIER_THRESHOLDS[2].sowPads && oos <= TIER_THRESHOLDS[2].oos && bs <= TIER_THRESHOLDS[2].bs) return 2;
  return 3;
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
      type Row = {
        seller_id: string; data: string | null; tim_month_id: number | null;
        tgmv_lc: any; gmv_lc: any; tsi: any; visits: any; inv_pads: any;
        rep_current_level: string | null; rep_cancellations_rate: any; ll_stock_availability_score: any;
      };
      const all: Row[] = [];
      const pageSize = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("sellers_kpi")
          .select("seller_id, data, tim_month_id, tgmv_lc, gmv_lc, tsi, visits, inv_pads, rep_current_level, rep_cancellations_rate, ll_stock_availability_score")
          .order("data", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // 3) group by seller -> month
      const bySeller = new Map<string, Map<string, { receita: number; visitas: number; tsi: number; invAds: number; repLevel: string | null; bs: number; oos: number; nOos: number; nBs: number }>>();
      all.forEach((r) => {
        const key = r.tim_month_id ? monthKeyFromTimMonthId(r.tim_month_id) : (r.data ? monthKey(r.data) : "");
        if (!key || key.length !== 7 || !r.seller_id) return;
        const m = bySeller.get(r.seller_id) ?? new Map();
        const cur = m.get(key) ?? { receita: 0, visitas: 0, tsi: 0, invAds: 0, repLevel: null as string | null, bs: 0, oos: 0, nOos: 0, nBs: 0 };
        cur.receita += toNum(r.tgmv_lc) || toNum(r.gmv_lc);
        cur.visitas += toNum(r.visits);
        cur.tsi += toNum(r.tsi);
        cur.invAds += toNum(r.inv_pads);
        if (r.rep_current_level) cur.repLevel = r.rep_current_level; // último visto vence
        const bsVal = toNum(r.rep_cancellations_rate);
        if (bsVal > 0) { cur.bs += bsVal; cur.nBs += 1; }
        const stock = toNum(r.ll_stock_availability_score);
        if (stock > 0) { cur.oos += (100 - stock); cur.nOos += 1; }
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

        // ---- Métricas oficiais (último mês com dado disponível) ----
        const sowPadsPct = last.receita > 0 ? (last.invAds / last.receita) * 100 : 0;
        const oosPct = last.nOos > 0 ? last.oos / last.nOos : NaN;
        const bsPct = last.nBs > 0 ? (last.bs / last.nBs) * 100 : NaN;

        // ---- Tier: prioridade Reputação → Métricas → fallback receita ----
        const tFromRep = repLevelToTier(last.repLevel);
        const tFromMet = (Number.isFinite(oosPct) && Number.isFinite(bsPct))
          ? tierFromMetricas(sowPadsPct, oosPct as number, bsPct as number)
          : null;
        let tier: 1 | 2 | 3 = 3;
        let tierFonte: LojaClassificada["tierFonte"] = "receita";
        if (tFromRep) { tier = tFromRep; tierFonte = "reputacao"; }
        else if (tFromMet) { tier = tFromMet; tierFonte = "metricas"; }

        const th = TIER_THRESHOLDS[tier];
        const checkRep: "ok" | "fail" | "na" = last.repLevel ? (repLevelToTier(last.repLevel) === tier ? "ok" : "fail") : "na";
        const checkSow: "ok" | "fail" | "na" = sowPadsPct >= th.sowPads ? "ok" : "fail";
        const checkOos: "ok" | "fail" | "na" = !Number.isFinite(oosPct) ? "na" : oosPct <= th.oos ? "ok" : "fail";
        const checkBs: "ok" | "fail" | "na" = !Number.isFinite(bsPct) ? "na" : bsPct <= th.bs ? "ok" : "fail";

        result.push({
          sellerId,
          custId: info.custId,
          nickname: info.nickname,
          cluster: info.cluster,
          subCluster: info.subCluster,
          tier,
          tierFonte,
          tierByRep: tFromRep,
          tierByMetricas: tFromMet,
          repLevel: last.repLevel,
          metricas: {
            sowPadsPct,
            oosPct: Number.isFinite(oosPct) ? oosPct : 0,
            bsPct: Number.isFinite(bsPct) ? bsPct : 0,
          },
          tierChecks: { sowPads: checkSow, oos: checkOos, bs: checkBs, rep: checkRep },
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
          visitasUlt: last.visitas,
          crUlt: last.visitas > 0 ? (last.tsi / last.visitas) * 100 : 0,
          meses: sorted.length,
        });
      });

      // Fallback por receita só para quem caiu em tier 3 sem métricas e sem reputação
      const semDados = result.filter((l) => l.tierFonte === "receita");
      semDados.sort((a, b) => b.receitaUlt - a.receitaUlt);
      const n = semDados.length;
      if (n > 0) {
        const t1 = Math.max(1, Math.ceil(n * 0.2));
        const t2 = t1 + Math.max(1, Math.ceil(n * 0.3));
        semDados.forEach((l, i) => { l.tier = (i < t1 ? 1 : i < t2 ? 2 : 3); });
      }
      return result.sort((a, b) => a.tier - b.tier || b.receitaUlt - a.receitaUlt);
    },
    staleTime: 60_000,
  });
}