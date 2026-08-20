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
  /** Mecanismos de desconto (cdp_mensal) — não exclusivos entre si */
  mecanismos: PockMecanismo[];
  /** Base do período para % dos mecanismos (F_TGMV_LC somado) */
  mecanismosBase: number;
  /** Adesão ao FULL por mês */
  full: PockFullMes[];
  /** cobertura % dos meses com TGMV_LC_FBM */
  coberturaFbm: number;
}

export interface PockMecanismo {
  chave: string;
  rotulo: string;
  valor: number;
  /** últimos 12 meses, para sparkline */
  historico: { mes: string; valor: number }[];
}

export interface PockFullMes {
  mes: string;
  itensFull: number | null;
  itensForaFull: number | null;
  /** % do GMV via FULL (null = sem cobertura, linha interrompe) */
  pctGmvFull: number | null;
}

export const MECANISMOS_DESCONTO: { chave: string; coluna: string; rotulo: string }[] = [
  { chave: "cdp", coluna: "f_tgmv_lc_cdp", rotulo: "CDP / Desconto Programado" },
  { chave: "automatic", coluna: "f_tgmv_lc_automatic", rotulo: "Automático" },
  { chave: "cupom", coluna: "f_tgmv_lc_cupom", rotulo: "Cupom" },
  { chave: "tiers", coluna: "f_tgmv_lc_tiers", rotulo: "Tiers" },
  { chave: "custom_seller", coluna: "f_tgmv_lc_custom_seller", rotulo: "Custom seller" },
  { chave: "dxb", coluna: "f_tgmv_lc_dxb", rotulo: "DXB" },
  { chave: "pre_acordo", coluna: "f_tgmv_lc_pre_acordo", rotulo: "Pré-Acordo" },
  { chave: "dod", coluna: "f_tgmv_lc_dod", rotulo: "DOD" },
  { chave: "lightning", coluna: "f_tgmv_lc_lightning", rotulo: "Lightning" },
  { chave: "regular", coluna: "f_tgmv_lc_regular", rotulo: "Regular (sem desconto)" },
];

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

      const [kpiRes, llRes, cdpRes] = await Promise.all([
        supabase
          .from("sellers_kpi")
          .select(
            "data, tgmv_lc, visits, tsi, tgmv_lc_flex, tgmv_lc_full, inv_pads, tgmv_lc_pads, cdp_tgmv_lc, tgmv_lc_clips, visitas_clips, orders_clips, rep_current_level, rep_claims_rate, rep_delayed_ht_rate, rep_cancellations_rate, score_final_full, score_final_pads, score_qualidade_final",
          )
          .eq("seller_id", sellerId)
          .order("data", { ascending: true }),
        supabase
          .from("live_listings")
          .select("data, itens")
          .eq("seller_id", sellerId)
          .order("data", { ascending: true })
          .range(0, 4999),
        supabase
          .from("cdp_mensal")
          .select(
            `tim_month_id, f_tgmv_lc, ${MECANISMOS_DESCONTO.map((m) => m.coluna).join(", ")}`,
          )
          .eq("seller_id", sellerId)
          .order("tim_month_id", { ascending: true }),
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
        // SELLERS_CLIPS_PUBLI vem zerada na base: presença de Clips é inferida
        // pelos sinais reais (GMV, visitas e pedidos via Clips).
        const sinais = [r.tgmv_lc_clips, r.visitas_clips, r.orders_clips];
        const temSinal = sinais.some((v) => v !== null && v !== undefined);
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
          temClips: temSinal ? sinais.some((v) => (Number(v) || 0) > 0) : null,
          ll: llPorMes.has(mes) ? llPorMes.get(mes)! : null,
        };
      });

      const ultima: any = (kpiRes.data ?? [])[(kpiRes.data ?? []).length - 1] ?? {};

      // ── Mecanismos de desconto (não exclusivos: a soma pode passar de 100%) ──
      const cdpRows: any[] = (cdpRes?.data as any[]) ?? [];
      const ultimos12 = cdpRows.slice(-12);
      const mecanismosBase = ultimos12.reduce((s, r) => s + (Number(r.f_tgmv_lc) || 0), 0);
      const mesDe = (id: any) => {
        const t = String(id ?? "");
        return t.length === 6 ? `${t.slice(0, 4)}-${t.slice(4, 6)}-01` : t;
      };
      const mecanismos: PockMecanismo[] = MECANISMOS_DESCONTO.map((m) => ({
        chave: m.chave,
        rotulo: m.rotulo,
        valor: ultimos12.reduce((s, r) => s + (Number(r[m.coluna]) || 0), 0),
        historico: ultimos12.map((r) => ({
          mes: mesDe(r.tim_month_id),
          valor: Number(r[m.coluna]) || 0,
        })),
      }));

      // ── Adesão ao FULL ────────────────────────────────────────────────
      // ITENS_FULL / ITENS_FORA_FULL não existem na camada agregada hoje:
      // ficam null (a área não é fabricada). A linha usa TGMV_LC_FULL/TGMV_LC.
      const full: PockFullMes[] = series.map((m) => ({
        mes: m.mes,
        itensFull: null,
        itensForaFull: null,
        pctGmvFull:
          m.tgmvFbm !== null && m.tgmv
            ? Math.min(100, (m.tgmvFbm / m.tgmv) * 100)
            : null,
      }));

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
        mecanismos,
        mecanismosBase,
        full,
        coberturaFbm: cobertura(series, "tgmvFbm"),
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