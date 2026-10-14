import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularFavorabilidade, calcularTaxaVenda, crescimento } from "@/lib/pockIndicadores";

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
  /** Taxa de Venda em p.p. contra a mediana do mercado */
  taxaVenda: { valor: number | null; seller: number | null; mercado: number | null; mesRef: string | null; pares: number };
  favorabilidade: ReturnType<typeof calcularFavorabilidade>;
  /** métricas do último mês para leitura da IA */
  metricas: Record<string, number | string | null>;
}

export interface PockData {
  series: PockMes[];
  snapshot: PockSnapshot;
  cobertura: Record<string, number>;
  /** Mecanismos de desconto (cdp_mensal) — não exclusivos entre si */
  mecanismos: PockMecanismo[];
  /** Base do período para % dos mecanismos (F_TGMV_LC somado) */
  mecanismosBase: number;
  /** Mês de referência da janela de 30 dias dos mecanismos */
  mecanismosMes: string | null;
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
            "data, tgmv_lc, bpc, score_qualidade_final, visits, tsi, tgmv_lc_flex, tgmv_lc_full, inv_pads, tgmv_lc_pads, cdp_tgmv_lc, tgmv_lc_clips, visitas_clips, orders_clips, rep_current_level, rep_claims_rate, rep_delayed_ht_rate, rep_cancellations_rate, score_final_full, score_final_pads, score_qualidade_final",
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
      // Meses sem nenhuma informação (base e mecanismos vazios) não entram na conta.
      const cdpRows: any[] = ((cdpRes?.data as any[]) ?? []).filter((r) =>
        [r.f_tgmv_lc, ...MECANISMOS_DESCONTO.map((m) => r[m.coluna])].some(
          (v) => v !== null && v !== undefined && v !== "",
        ),
      );
      // Travado em 30 dias (prazo limite de promoção): usa só o mês mais recente com informação.
      const ultimos12 = cdpRows.slice(-1);
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

      // Último mês em que a planilha trouxe a nota (meses sem a coluna ficam vazios).
      const ultimoCom = (col: string) => {
        const rows: any[] = (kpiRes.data ?? []) as any[];
        for (let i = rows.length - 1; i >= 0; i--) {
          const v = rows[i]?.[col];
          if (v !== null && v !== undefined && v !== "") return v;
        }
        return null;
      };

      // ── Indicadores derivados ───────────────────────────────────────
      const tg = Number(ultima.tgmv_lc) || 0;
      const share = (v: any) => (tg > 0 && v !== null && v !== undefined ? Number(v) / tg : null);
      const bpc = num(ultima.bpc);
      const ads = share(ultima.inv_pads);
      const fullShare = share(ultima.tgmv_lc_full);
      const promo = share(ultima.cdp_tgmv_lc);
      const favorabilidade = calcularFavorabilidade({
        bpc, repLevel: ultima.rep_current_level || null, ads, full: fullShare, promo,
      });

      // Último mês fechado (o mês corrente é parcial) contra o anterior, vs mercado.
      const rows: any[] = (kpiRes.data ?? []) as any[];
      const hoje = new Date().toISOString().slice(0, 7);
      const fechados = rows.filter((r) => String(r.data).slice(0, 7) < hoje);
      const a = fechados[fechados.length - 1];
      const b = fechados[fechados.length - 2];
      let taxaVenda = { valor: null as number | null, seller: null as number | null, mercado: null as number | null, mesRef: null as string | null, pares: 0 };
      if (a && b) {
        const { data: sel } = await supabase.from("sellers").select("sub_cluster_seller").eq("id", sellerId).maybeSingle();
        let q = supabase.from("sellers_kpi").select("seller_id, data, tgmv_lc").in("data", [a.data, b.data]);
        if (sel?.sub_cluster_seller) {
          const { data: ids } = await supabase.from("sellers").select("id").eq("sub_cluster_seller", sel.sub_cluster_seller).range(0, 4999);
          const lista = (ids ?? []).map((x: any) => x.id);
          if (lista.length >= 5) q = q.in("seller_id", lista.slice(0, 900));
        }
        const { data: pares } = await q.range(0, 9999);
        const por = new Map<string, { a?: number; b?: number }>();
        for (const r of (pares ?? []) as any[]) {
          const e = por.get(r.seller_id) ?? {};
          if (r.data === a.data) e.a = Number(r.tgmv_lc) || 0; else e.b = Number(r.tgmv_lc) || 0;
          por.set(r.seller_id, e);
        }
        const cres = [...por.entries()]
          .filter(([id]) => id !== sellerId)
          .map(([, e]) => crescimento(e.a ?? null, e.b ?? null))
          .filter((v): v is number => v !== null && Number.isFinite(v) && Math.abs(v) < 500);
        const t = calcularTaxaVenda(crescimento(num(a.tgmv_lc), num(b.tgmv_lc)), cres);
        taxaVenda = { ...t, mesRef: String(a.data).slice(0, 7), pares: cres.length };
      }

      const snapshot: PockSnapshot = {
        repLevel: ultima.rep_current_level || null,
        repClaimsRate: num(ultima.rep_claims_rate),
        repDelayedRate: num(ultima.rep_delayed_ht_rate),
        repCancellationsRate: num(ultima.rep_cancellations_rate),
        // REP_DISPUTES_RATE não existe na camada agregada hoje
        repDisputesRate: null,
        // SCORE_FINAL_BBF não existe na camada agregada hoje
        scoreBbf: num(ultimoCom("score_qualidade_final")),
        scoreFull: num(ultimoCom("score_final_full")),
        scorePads: num(ultimoCom("score_final_pads")),
        scoreIntegradores: null,
        usoCentralPromocoes: promo === null ? null : Math.min(100, promo * 100),
        taxaVenda,
        favorabilidade,
        metricas: {
          mes: ultima.data ?? null,
          faturamento: num(ultima.tgmv_lc),
          visitas: num(ultima.visits),
          vendas: num(ultima.tsi),
          competitividade_preco_pct: bpc === null ? null : Math.round(bpc * 1000) / 10,
          reputacao: ({ green_platinum: "MercadoLíder Platinum", green_gold: "MercadoLíder Gold", green_silver: "MercadoLíder", green: "Verde", light_green: "Verde claro", yellow: "Amarela", orange: "Laranja", red: "Vermelha", newbie: "Novo vendedor" } as Record<string, string>)[ultima.rep_current_level] ?? ultima.rep_current_level ?? null,
          reclamacoes_pct: num(ultima.rep_claims_rate),
          atrasos_pct: num(ultima.rep_delayed_ht_rate),
          cancelamentos_pct: num(ultima.rep_cancellations_rate),
          ads_sobre_faturamento_pct: ads === null ? null : Math.round(ads * 1000) / 10,
          roas: ultima.inv_pads > 0 ? Math.round((Number(ultima.tgmv_lc_pads) / Number(ultima.inv_pads)) * 10) / 10 : null,
          full_pct: fullShare === null ? null : Math.round(fullShare * 1000) / 10,
          flex_pct: tg > 0 ? Math.round((Number(ultima.tgmv_lc_flex) / tg) * 1000) / 10 : null,
          promocao_pct: promo === null ? null : Math.round(promo * 1000) / 10,
          clips_faturamento: num(ultima.tgmv_lc_clips),
          crescimento_mes_pct: taxaVenda.seller === null ? null : Math.round(taxaVenda.seller * 10) / 10,
          crescimento_mercado_pct: taxaVenda.mercado === null ? null : Math.round(taxaVenda.mercado * 10) / 10,
          favorabilidade_pct: favorabilidade.valor,
        },
      };

      return {
        series,
        snapshot,
        mecanismos,
        mecanismosBase,
        mecanismosMes: ultimos12[0] ? mesDe(ultimos12[0].tim_month_id) : null,
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