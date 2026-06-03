import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, ChevronDown, ChevronUp, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEligibility, type EligibilityItem } from "@/hooks/useEligibility";

interface QualityRow {
  item_id: string;
  data: string;
  ll_price_score: number | null;
  ll_promotions_score: number | null;
  ll_pictures_score: number | null;
}

type Severidade = "alta" | "media" | "baixa";

interface AnuncioFlag {
  itemId: string;
  mlbLink: string;
  precoScoreAtual: number;
  precoScoreAnterior: number | null;
  quedaPp: number;
  promoScore: number;
  pedidos7d: number;
  itemName: string;
  motivos: string[];
  acao: string;
  severidade: Severidade;
}

function useQualityHistory(sellerId: string | undefined) {
  return useQuery({
    queryKey: ["mon-preco-history", sellerId],
    queryFn: async (): Promise<QualityRow[]> => {
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from("seller_listings_quality")
        .select("item_id, data, ll_price_score, ll_promotions_score, ll_pictures_score")
        .eq("seller_id", sellerId)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!sellerId,
  });
}

function buildMlbLink(itemId: string) {
  const clean = String(itemId).replace(/\D/g, "");
  return `https://www.mercadolivre.com.br/anuncios/MLB${clean}/modificar`;
}

function detectarAnuncios(
  history: QualityRow[],
  eligibility: EligibilityItem[]
): AnuncioFlag[] {
  const elMap = new Map<string, EligibilityItem>();
  for (const e of eligibility) elMap.set(String(e.itemId), e);

  // Group history per item, sorted desc
  const byItem = new Map<string, QualityRow[]>();
  for (const r of history) {
    if (!byItem.has(r.item_id)) byItem.set(r.item_id, []);
    byItem.get(r.item_id)!.push(r);
  }

  const out: AnuncioFlag[] = [];
  for (const [itemId, rows] of byItem) {
    const sorted = [...rows].sort((a, b) => (a.data < b.data ? 1 : -1));
    const atual = sorted[0];
    const anterior = sorted.find(
      (r) => r.data !== atual.data && (r.ll_price_score ?? null) !== null
    );
    const precoAtual = Number(atual.ll_price_score) || 0;
    const precoAnt = anterior ? Number(anterior.ll_price_score) || 0 : null;
    const queda = precoAnt !== null ? precoAnt - precoAtual : 0;
    const promo = Number(atual.ll_promotions_score) || 0;
    const el = elMap.get(itemId);
    const pedidos = el?.pedidos7d || 0;
    const semCDP = !el?.flagBestPromo && !el?.flagItemSOptin;

    const motivos: string[] = [];
    let severidade: Severidade = "baixa";
    let acao = "";

    if (queda >= 10) {
      motivos.push(`Score de preço caiu ${queda.toFixed(0)}pp (${precoAnt}→${precoAtual})`);
      severidade = "alta";
      acao = "Revisar preço urgente — possível ajuste pós-aumento ou queda da concorrência.";
    }
    if (precoAtual > 0 && precoAtual < 60) {
      motivos.push(`Score de preço atual baixo (${precoAtual}/100)`);
      if (severidade !== "alta") severidade = "media";
      if (!acao) acao = "Reduzir preço ou ativar CDP para recuperar competitividade.";
    }
    if (semCDP && promo < 50 && pedidos > 5) {
      motivos.push(`Sem CDP ativo com ${pedidos} pedidos/7d (promo score ${promo})`);
      if (severidade === "baixa") severidade = "media";
      if (!acao) acao = "Ativar Campanha de Desconto (CDP) — anúncio com tração sem proteção competitiva.";
    }
    if (motivos.length === 0) continue;

    out.push({
      itemId,
      mlbLink: buildMlbLink(itemId),
      precoScoreAtual: precoAtual,
      precoScoreAnterior: precoAnt,
      quedaPp: queda,
      promoScore: promo,
      pedidos7d: pedidos,
      itemName: el?.itemName || `MLB ${itemId}`,
      motivos,
      acao,
      severidade,
    });
  }

  const ordem: Record<Severidade, number> = { alta: 0, media: 1, baixa: 2 };
  return out.sort(
    (a, b) =>
      ordem[a.severidade] - ordem[b.severidade] ||
      b.quedaPp - a.quedaPp ||
      b.pedidos7d - a.pedidos7d
  );
}

const SEV_CFG: Record<Severidade, { cor: string; bg: string; borda: string; label: string }> = {
  alta:  { cor: "#DC2626", bg: "rgba(220,38,38,0.06)",  borda: "rgba(220,38,38,0.35)",  label: "Alta" },
  media: { cor: "#D97706", bg: "rgba(217,119,6,0.06)",  borda: "rgba(217,119,6,0.35)",  label: "Média" },
  baixa: { cor: "#22D3EE", bg: "rgba(34,211,238,0.06)", borda: "rgba(34,211,238,0.35)", label: "Baixa" },
};

function ItemRow({ a }: { a: AnuncioFlag }) {
  const [open, setOpen] = useState(false);
  const cfg = SEV_CFG[a.severidade];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: cfg.borda, backgroundColor: cfg.bg }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="status-badge text-[10px] uppercase tracking-wide flex-shrink-0"
          style={{ color: cfg.cor, borderColor: cfg.borda, backgroundColor: cfg.bg }}
        >
          {cfg.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{a.itemName}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">MLB {a.itemId} · {a.motivos[0]}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score Preço</p>
            <p className="text-sm font-bold font-mono tabular-nums" style={{ color: cfg.cor }}>
              {a.precoScoreAnterior !== null && a.quedaPp > 0
                ? `${a.precoScoreAnterior}→${a.precoScoreAtual}`
                : a.precoScoreAtual}
            </p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t space-y-2" style={{ borderColor: cfg.borda }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Sinais detectados</p>
            <ul className="space-y-0.5">
              {a.motivos.map((m, i) => (
                <li key={i} className="text-xs text-foreground/90 flex items-start gap-1.5">
                  <span style={{ color: cfg.cor }}>•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md p-2.5 border" style={{ borderColor: cfg.borda, backgroundColor: "rgba(255,255,255,0.02)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: cfg.cor }}>
              💡 Ação recomendada
            </p>
            <p className="text-xs text-foreground leading-relaxed">{a.acao}</p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Pedidos 7d: <span className="text-foreground tabular-nums">{a.pedidos7d}</span> · Promo: <span className="text-foreground tabular-nums">{a.promoScore}/100</span>
            </span>
            <a
              href={a.mlbLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Abrir no ML Sellers <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export interface MonitoramentoPrecoPanelProps {
  sellerId: string | undefined;
}

export function MonitoramentoPrecoPanel({ sellerId }: MonitoramentoPrecoPanelProps) {
  const { data: history = [], isLoading } = useQualityHistory(sellerId);
  const { data: eligibility = [] } = useEligibility(sellerId);

  const anuncios = useMemo(
    () => detectarAnuncios(history, eligibility),
    [history, eligibility]
  );

  const nAlta = anuncios.filter((a) => a.severidade === "alta").length;
  const nMedia = anuncios.filter((a) => a.severidade === "media").length;

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-warning" />
            Monitoramento de Preço por Anúncio
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            MLBs com sinal de alteração de preço, queda de competitividade ou ausência de CDP em anúncios com tração.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {nAlta > 0 && (
            <span className="status-badge text-[11px]" style={{ color: SEV_CFG.alta.cor, borderColor: SEV_CFG.alta.borda, backgroundColor: SEV_CFG.alta.bg }}>
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {nAlta} crítico{nAlta > 1 ? "s" : ""}
            </span>
          )}
          {nMedia > 0 && (
            <span className="status-badge text-[11px]" style={{ color: SEV_CFG.media.cor, borderColor: SEV_CFG.media.borda, backgroundColor: SEV_CFG.media.bg }}>
              {nMedia} atenção
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <p className="text-xs text-muted-foreground">Carregando histórico de qualidade dos anúncios…</p>
        </div>
      )}

      {!isLoading && anuncios.length === 0 && (
        <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-6 text-center">
          <p className="text-sm font-medium text-emerald">✅ Nenhum anúncio com alteração detectada.</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Nenhum MLB apresentou queda de score de preço, score baixo ou tração sem CDP no período avaliado.
          </p>
        </div>
      )}

      {anuncios.length > 0 && (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {anuncios.map((a) => (
            <ItemRow key={a.itemId} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MonitoramentoPrecoPanel;