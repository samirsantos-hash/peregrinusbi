import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cortes μ±z·σ por vertical dominante (padrão F8), com fallback global
 * quando a vertical tem menos de MIN_N sellers ativos no mês fechado mais recente.
 *
 * Métricas cobertas: conversão (%), ROAS (x), ACOS (%), TACOS (%).
 * As bandas usam z = 1,2816 (percentil 10/90 sob normalidade).
 */

export const VT_Z = 1.2816;
export const VT_MIN_N = 20;

export type VtMetric = "conv" | "roas" | "acos" | "tacos" | "efect";

export interface VtStat {
  vertical: string;
  n: number;
  mean: number;
  sd: number;
  /** limite inferior (μ − z·σ) — "abaixo do esperado" */
  low: number;
  /** limite superior (μ + z·σ) — "acima do esperado" */
  high: number;
  source: "vertical" | "global";
}

export interface VerticalThresholdsModel {
  perVertical: Record<VtMetric, Record<string, VtStat>>;
  global: Record<VtMetric, VtStat>;
  latestDate: string | null;
  totalSellers: number;
  verticalsWithSample: number;
  loading: boolean;
  error?: string;
}

function meanSd(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  if (n < 2) return { mean, sd: 0 };
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return { mean, sd: Math.sqrt(variance) };
}

function stat(vertical: string, values: number[], source: "vertical" | "global"): VtStat {
  const { mean, sd } = meanSd(values);
  return { vertical, n: values.length, mean, sd, low: mean - VT_Z * sd, high: mean + VT_Z * sd, source };
}

const METRICS: VtMetric[] = ["conv", "roas", "acos", "tacos", "efect"];

const EMPTY_STAT: VtStat = { vertical: "", n: 0, mean: 0, sd: 0, low: 0, high: 0, source: "global" };

export function useVerticalThresholds(): VerticalThresholdsModel {
  const [model, setModel] = useState<VerticalThresholdsModel>({
    perVertical: { conv: {}, roas: {}, acos: {}, tacos: {}, efect: {} },
    global: { conv: EMPTY_STAT, roas: EMPTY_STAT, acos: EMPTY_STAT, tacos: EMPTY_STAT, efect: EMPTY_STAT },
    latestDate: null,
    totalSellers: 0,
    verticalsWithSample: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: latestRow } = await supabase
          .from("sellers_kpi")
          .select("data")
          .order("data", { ascending: false })
          .limit(1);
        const latestDate = latestRow?.[0]?.data ?? null;
        if (!latestDate) {
          if (!cancelled) setModel(m => ({ ...m, loading: false, error: "sem dados" }));
          return;
        }

        // 1) Todos os KPIs do mês fechado mais recente
        const PAGE = 1000;
        let from = 0;
        const kpiRows: any[] = [];
        while (true) {
          const { data } = await supabase
            .from("sellers_kpi")
            .select("seller_id, visits, tsi, inv_pads, tgmv_lc_pads, tgmv_lc")
            .eq("data", latestDate)
            .range(from, from + PAGE - 1);
          if (!data || data.length === 0) break;
          kpiRows.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }

        // 2) Verticais dominantes
        from = 0;
        const vertMap: Record<string, string> = {};
        while (true) {
          const { data } = await supabase
            .from("sellers")
            .select("id, vertical_dominant")
            .range(from, from + PAGE - 1);
          if (!data || data.length === 0) break;
          for (const s of data as any[]) if (s.vertical_dominant) vertMap[s.id] = s.vertical_dominant;
          if (data.length < PAGE) break;
          from += PAGE;
        }

        // 3) Efetividade agregada mais recente por seller
        const efectMap: Record<string, number> = {};
        from = 0;
        while (true) {
          const { data } = await supabase
            .from("meli_campaigns")
            .select("seller_id, efect_rta_vertical, data")
            .order("data", { ascending: false })
            .range(from, from + PAGE - 1);
          if (!data || data.length === 0) break;
          for (const r of data as any[]) {
            if (efectMap[r.seller_id] === undefined) {
              let e = Number(r.efect_rta_vertical) || 0;
              if (e > 0 && e < 10) e = e * 100;
              efectMap[r.seller_id] = e;
            }
          }
          if (data.length < PAGE) break;
          from += PAGE;
        }

        // 4) Agrupamento por vertical
        const byVert: Record<string, Record<VtMetric, number[]>> = {};
        const global: Record<VtMetric, number[]> = { conv: [], roas: [], acos: [], tacos: [], efect: [] };
        const ensure = (v: string) => {
          if (!byVert[v]) byVert[v] = { conv: [], roas: [], acos: [], tacos: [], efect: [] };
          return byVert[v];
        };

        for (const r of kpiRows) {
          const v = vertMap[r.seller_id];
          const bucket = v ? ensure(v) : null;
          const visits = Number(r.visits) || 0;
          const tsi = Number(r.tsi) || 0;
          const inv = Number(r.inv_pads) || 0;
          const tgmvPads = Number(r.tgmv_lc_pads) || 0;
          const tgmv = Number(r.tgmv_lc) || 0;
          if (visits > 0) {
            const conv = (tsi / visits) * 100;
            global.conv.push(conv);
            if (bucket) bucket.conv.push(conv);
          }
          if (inv > 0) {
            const roas = tgmvPads / inv;
            global.roas.push(roas);
            if (bucket) bucket.roas.push(roas);
          }
          if (tgmvPads > 0) {
            const acos = (inv / tgmvPads) * 100;
            global.acos.push(acos);
            if (bucket) bucket.acos.push(acos);
          }
          if (tgmv > 0) {
            const tacos = (inv / tgmv) * 100;
            global.tacos.push(tacos);
            if (bucket) bucket.tacos.push(tacos);
          }
          const e = efectMap[r.seller_id];
          if (e !== undefined && e > 0) {
            global.efect.push(e);
            if (bucket) bucket.efect.push(e);
          }
        }

        const globalStats: Record<VtMetric, VtStat> = {
          conv: stat("__global__", global.conv, "global"),
          roas: stat("__global__", global.roas, "global"),
          acos: stat("__global__", global.acos, "global"),
          tacos: stat("__global__", global.tacos, "global"),
          efect: stat("__global__", global.efect, "global"),
        };

        const perVertical: Record<VtMetric, Record<string, VtStat>> = {
          conv: {}, roas: {}, acos: {}, tacos: {}, efect: {},
        };
        let verticalsWithSample = 0;
        for (const [vert, buckets] of Object.entries(byVert)) {
          let anyEnough = false;
          for (const m of METRICS) {
            if (buckets[m].length >= VT_MIN_N) {
              perVertical[m][vert] = stat(vert, buckets[m], "vertical");
              anyEnough = true;
            } else {
              perVertical[m][vert] = { ...globalStats[m], vertical: vert, source: "global" };
            }
          }
          if (anyEnough) verticalsWithSample++;
        }

        if (!cancelled) {
          setModel({
            perVertical,
            global: globalStats,
            latestDate,
            totalSellers: kpiRows.length,
            verticalsWithSample,
            loading: false,
          });
        }
      } catch (err: any) {
        if (!cancelled) setModel(m => ({ ...m, loading: false, error: String(err?.message || err) }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return model;
}

/** Recupera o stat de uma métrica p/ uma vertical, com fallback global embutido. */
export function vtStatFor(
  model: VerticalThresholdsModel,
  metric: VtMetric,
  vertical: string | null | undefined,
): VtStat {
  const key = vertical || "";
  const stat = key ? model.perVertical[metric][key] : undefined;
  return stat || { ...model.global[metric], vertical: key || "(global)", source: "global" };
}

/**
 * Classifica um valor observado em relação ao stat (menor = ruim/bom depende do sinal).
 *   sign=+1 : maior é melhor (ROAS, conv, efect)
 *   sign=-1 : menor é melhor (ACOS, TACOS)
 */
export function classifyVsThreshold(
  value: number,
  stat: VtStat,
  sign: 1 | -1,
): "good" | "warn" | "bad" {
  if (!Number.isFinite(value) || stat.sd === 0) return "warn";
  if (sign > 0) {
    if (value >= stat.high) return "good";
    if (value < stat.low) return "bad";
    return "warn";
  }
  if (value <= stat.low) return "good";
  if (value > stat.high) return "bad";
  return "warn";
}