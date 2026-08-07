import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * POCK lê da camada agregada (sellers_kpi + live_listings), nunca de raw_*.
 * Regra de dado: campo vazio -> null (nunca zero). Flags nunca são somadas.
 */
export interface PockMes {
  /** YYYY-MM-01 */
  mes: string;
  tgmv: number | null;
  visitas: number | null;
  tsi: number | null;
  tgmvFlex: number | null;
  tgmvFbm: number | null;
  invPads: number | null;
  tgmvPads: number | null;
  cdpTgmv: number | null;
  tgmvClips: number | null;
  /** flag booleana (nunca somada) */
  temClips: boolean | null;
  ll: number | null;
}

export interface PockSnapshot {
  repLevel: string | null;
  repClaimsRate: number | null;
  repDelayedRate: number | null;
  repCancellationsRate: number | null;
  repDisputesRate: number | null;
  scoreBbf: number | null;
  scoreFull: number | null;
  scorePads: number | null;
  scoreIntegradores: number | null;
  usoCentralPromocoes: number | null;
}

export interface PockData {
  series: PockMes[];
  snapshot: PockSnapshot;
  cobertura: Record<string, number>;
}

const num = (v: any): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

function cobertura(series: PockMes[], key: keyof PockMes): number {
  if (!series.length) return 0;
  const ok = series.filter((s) => s[key] !== null && s[key] !== undefined).length;
  return (ok / series.length) * 100;
}

export function usePockData(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["pock", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<PockData> => {
      if (!sellerId) throw new Error("sem seller");

      const [kpiRes, llRes] = await Promise.all([
        supabase
          .from("sellers_kpi")
          .select(
            "data, tgmv_lc, visits, tsi, tgmv_lc_flex, tgmv_lc_full, inv_pads, tgmv_lc_pads, cdp_tgmv_lc, tgmv_lc_clips, sellers_clips_publi, rep_current_level, rep_claims_rate, rep_delayed_ht_rate, rep_cancellations_rate, score_final_full, score_final_pads, score_qualidade_final",
          )
          .eq("seller_id", sellerId)
          .order("data", { ascending: true }),
        supabase
          .from("live_listings")
          .select("data, itens")
          .eq("seller_id", sellerId)
          .order("data", { ascending: true })
          .range(0, 4999),
      ]);

      if (kpiRes.error) throw kpiRes.error;

      const llPorMes = new Map<string, number>();
      for (const r of llRes.data ?? []) {
        if (!r.data) continue;
        const mes = `${String(r.data).slice(0, 7)}-01`;
        llPorMes.set(mes, (llPorMes.get(mes) ?? 0) + (Number(r.itens) || 0));
      }

      const series: PockMes[] = (kpiRes.data ?? []).map((r: any) => {
        const mes = `${String(r.data).slice(0, 7)}-01`;
        const clipsFlag = r.sellers_clips_publi;
        return {
          mes,
          tgmv: num(r.tgmv_lc),
          visitas: num(r.visits),
          tsi: num(r.tsi),
          tgmvFlex: num(r.tgmv_lc_flex),
          // tgmv_lc_full é a coluna de FBM na camada agregada
          tgmvFbm: num(r.tgmv_lc_full),
          invPads: num(r.inv_pads),
          tgmvPads: num(r.tgmv_lc_pads),
          cdpTgmv: num(r.cdp_tgmv_lc),
          tgmvClips: num(r.tgmv_lc_clips),
          temClips:
            clipsFlag === null || clipsFlag === undefined ? null : Number(clipsFlag) > 0,
          ll: llPorMes.has(mes) ? llPorMes.get(mes)! : null,
        };
      });

      const ultima: any = (kpiRes.data ?? [])[(kpiRes.data ?? []).length - 1] ?? {};

      const snapshot: PockSnapshot = {
        repLevel: ultima.rep_current_level || null,
        repClaimsRate: num(ultima.rep_claims_rate),
        repDelayedRate: num(ultima.rep_delayed_ht_rate),
        repCancellationsRate: num(ultima.rep_cancellations_rate),
        // REP_DISPUTES_RATE não existe na camada agregada hoje
        repDisputesRate: null,
        // SCORE_FINAL_BBF não existe na camada agregada hoje
        scoreBbf: null,
        scoreFull: num(ultima.score_final_full),
        scorePads: num(ultima.score_final_pads),
        scoreIntegradores: null,
        usoCentralPromocoes: null,
      };

      return {
        series,
        snapshot,
        cobertura: {
          tgmv: cobertura(series, "tgmv"),
          ll: cobertura(series, "ll"),
          visitas: cobertura(series, "visitas"),
          tgmvFlex: cobertura(series, "tgmvFlex"),
          tgmvFbm: cobertura(series, "tgmvFbm"),
          invPads: cobertura(series, "invPads"),
          cdpTgmv: cobertura(series, "cdpTgmv"),
          tgmvClips: cobertura(series, "tgmvClips"),
          temClips: cobertura(series, "temClips"),
          tsi: cobertura(series, "tsi"),
        },
      };
    },
  });
}