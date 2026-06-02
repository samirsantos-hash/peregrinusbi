import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Info, ChevronDown, ChevronRight, ExternalLink, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TooltipInfo from "./TooltipInfo";

type Diagnostico = "ok" | "qualidade" | "visibilidade" | "estoque_parado" | "sem_dados";
type StatusGiro = "parado" | "lento" | "normal" | "girando";

interface MLBPerformance {
  itemId: string;
  itemName: string;
  vertical: string;
  pedidos7d: number;
  estoqueMedio: number;
  estoqueFull: number;
  flagOptinCdp: boolean;
  flagBestPromo: boolean;
  descontoSellerPct: number;
  diasEstoque: number | null;
  statusGiro: StatusGiro;
  shareEstoqueFull: number;
  qualityScore: number | null;
  scoreFotos: number | null;
  scoreTitulo: number | null;
  scoreFicha: number | null;
  diagnostico: Diagnostico;
  acoes: string[];
  prioridade: 1 | 2 | 3;
  mlbLink: string;
}

function avgPositive(vals: number[]) {
  const v = vals.filter((x) => Number.isFinite(x) && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

async function fetchMLBPerformance(sellerUuid: string): Promise<MLBPerformance[]> {
  if (!sellerUuid) return [];

  const { data: eleg, error } = await supabase
    .from("seller_eligibility")
    .select(
      "item_id, item_name, vertical_item, pedidos_7d, media_tsi_diario_7d, estoque_medio_7d, estoque_medio_full_7d, flag_item_s_optin, flag_best_promo, discount_seller_percentage",
    )
    .eq("seller_id", sellerUuid)
    .gt("estoque_medio_7d", 0)
    .order("pedidos_7d", { ascending: false })
    .limit(150);

  if (error) throw error;
  if (!eleg || eleg.length === 0) return [];

  const itemIds = eleg.map((r: any) => String(r.item_id));
  const { data: quality } = await supabase
    .from("seller_listings_quality")
    .select("item_id, ll_pictures_score, ll_title_score, score_caracteristica_final, data")
    .eq("seller_id", sellerUuid)
    .in("item_id", itemIds)
    .order("data", { ascending: false });

  // Latest row per item_id
  const qualityMap = new Map<string, any>();
  for (const q of quality ?? []) {
    const k = String((q as any).item_id);
    if (!qualityMap.has(k)) qualityMap.set(k, q);
  }

  return eleg.map((r: any): MLBPerformance => {
    const pedidos = Number(r.pedidos_7d) || 0;
    const estoque = Number(r.estoque_medio_7d) || 0;
    const estFull = Number(r.estoque_medio_full_7d) || 0;
    const mediaDay = Number(r.media_tsi_diario_7d) || 0;
    const q = qualityMap.get(String(r.item_id));

    const diasEstoque: number | null =
      mediaDay > 0 ? Math.round(estoque / mediaDay) : pedidos > 0 ? 999 : null;

    const statusGiro: StatusGiro =
      pedidos === 0
        ? "parado"
        : diasEstoque === null || diasEstoque > 60
          ? "lento"
          : diasEstoque > 15
            ? "normal"
            : "girando";

    const shareFull = estoque > 0 ? (estFull / estoque) * 100 : 0;

    const scoreF = q ? Number(q.ll_pictures_score) || null : null;
    const scoreT = q ? Number(q.ll_title_score) || null : null;
    const scoreC = q ? Number(q.score_caracteristica_final) || null : null;
    const qualityScore = q
      ? avgPositive([Number(q.ll_pictures_score) || 0, Number(q.ll_title_score) || 0, Number(q.score_caracteristica_final) || 0])
      : null;

    const flagOptin = Boolean(r.flag_item_s_optin);
    const acoes: string[] = [];
    let diagnostico: Diagnostico = "ok";
    let prioridade: 1 | 2 | 3 = 3;

    if (q && qualityScore !== null) {
      if (statusGiro === "parado" || statusGiro === "lento") {
        if (qualityScore < 50) {
          diagnostico = "qualidade";
          prioridade = 1;
          const fixFirst =
            (scoreC ?? 100) < 70 ? "ficha técnica" : (scoreF ?? 100) < 60 ? "fotos" : "título";
          acoes.push(
            `Score ${qualityScore.toFixed(0)}/100 — anúncio pouco visível no orgânico. Corrigir ${fixFirst} primeiro.`,
          );
        } else if (!flagOptin) {
          diagnostico = "visibilidade";
          prioridade = 1;
          acoes.push(
            statusGiro === "parado"
              ? `Sem vendas e sem CDP. Ativar promoção para gerar tráfego. Estoque: ${estoque.toFixed(0)} un paradas.`
              : `Estoque para ${diasEstoque} dias sem CDP ativo. Ativar campanha para acelerar o giro.`,
          );
        } else {
          diagnostico = "estoque_parado";
          prioridade = 2;
          acoes.push(
            `Estoque para ${diasEstoque ?? "?"} dias com CDP ativo. Avaliar redução de preço ou aumento do desconto.`,
          );
        }
      } else if (pedidos > 0 && qualityScore < 70) {
        diagnostico = "qualidade";
        prioridade = 2;
        acoes.push(
          `Score ${qualityScore.toFixed(0)}/100 — melhorar para > 70 aumenta exposição orgânica mesmo com vendas ativas.`,
        );
      }
    } else {
      diagnostico = "sem_dados";
      if (statusGiro === "parado") {
        acoes.push(
          diasEstoque === null
            ? `${estoque.toFixed(0)} unidades em estoque sem histórico de vendas. Verificar se o anúncio está ativo e com preço competitivo.`
            : `Estoque para mais de 60 dias sem venda. Capital imobilizado — avaliar promoção ou ajuste de preço.`,
        );
        prioridade = 2;
      }
      if (!flagOptin && pedidos < 3) {
        acoes.push("Sem opt-in na CDP. Ativar promoção pode gerar visibilidade orgânica gratuita.");
      }
    }

    const cleanId = String(r.item_id).replace(/\D/g, "");

    return {
      itemId: String(r.item_id),
      itemName: r.item_name || "",
      vertical: r.vertical_item || "",
      pedidos7d: pedidos,
      estoqueMedio: estoque,
      estoqueFull: estFull,
      flagOptinCdp: flagOptin,
      flagBestPromo: Boolean(r.flag_best_promo),
      descontoSellerPct: Number(r.discount_seller_percentage) || 0,
      diasEstoque,
      statusGiro,
      shareEstoqueFull: shareFull,
      qualityScore,
      scoreFotos: scoreF,
      scoreTitulo: scoreT,
      scoreFicha: scoreC,
      diagnostico,
      acoes,
      prioridade,
      mlbLink: cleanId ? `https://produto.mercadolivre.com.br/MLB-${cleanId}` : "",
    };
  });
}

const DIAG_EMOJI: Record<Diagnostico, string> = {
  qualidade: "🔴",
  visibilidade: "🟠",
  estoque_parado: "🟡",
  sem_dados: "⚪",
  ok: "✅",
};

const DIAG_ORDER: Record<Diagnostico, number> = {
  qualidade: 0,
  visibilidade: 1,
  estoque_parado: 2,
  sem_dados: 3,
  ok: 4,
};

const GIRO_CONFIG: Record<StatusGiro, { emoji: string; label: string; cls: string; title: string }> = {
  parado: { emoji: "🔴", label: "Parado", cls: "bg-destructive/10 text-destructive", title: "Nenhum pedido esta semana" },
  lento: { emoji: "🟠", label: "Lento", cls: "bg-orange-500/10 text-orange-500", title: "Mais de 60 dias de estoque" },
  normal: { emoji: "🟡", label: "Normal", cls: "bg-warning/10 text-warning", title: "15 a 60 dias de estoque" },
  girando: { emoji: "🟢", label: "Girando", cls: "bg-emerald/10 text-emerald", title: "Menos de 15 dias — monitorar reposição" },
};

function ItemRow({ item }: { item: MLBPerformance }) {
  const [aberto, setAberto] = useState(false);
  const giro = GIRO_CONFIG[item.statusGiro] ?? GIRO_CONFIG.parado;
  const ipiColor =
    item.qualityScore === null
      ? "text-muted-foreground"
      : item.qualityScore >= 70
        ? "bg-emerald/10 text-emerald"
        : item.qualityScore >= 50
          ? "bg-warning/10 text-warning"
          : "bg-destructive/10 text-destructive";

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition"
        onClick={() => setAberto(!aberto)}
      >
        <td className="py-2 px-2">
          <div className="flex items-center gap-2 min-w-0">
            {aberto ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
            <span>{DIAG_EMOJI[item.diagnostico]}</span>
            <div className="min-w-0">
              <a
                href={item.mlbLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-mono text-primary hover:underline inline-flex items-center gap-0.5"
              >
                MLB{item.itemId}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                {item.itemName}
              </p>
            </div>
          </div>
        </td>
        <td className="py-2 px-2 text-right text-xs font-mono tabular-nums">{item.pedidos7d.toFixed(0)}</td>
        <td className="py-2 px-2 text-center">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${giro.cls}`}
            title={giro.title}
          >
            {giro.emoji} {giro.label}
          </span>
        </td>
        <td className="py-2 px-2 text-right text-xs font-mono tabular-nums">
          {item.diasEstoque === null ? (
            <span className="text-muted-foreground">—</span>
          ) : item.diasEstoque >= 999 ? (
            <span className="text-muted-foreground text-[10px]">s/ histórico</span>
          ) : (
            <span>{item.diasEstoque} dias</span>
          )}
        </td>
        <td className="py-2 px-2 text-right text-xs font-mono tabular-nums">{item.estoqueMedio.toFixed(0)}</td>
        <td className={`py-2 px-2 text-right text-xs font-mono tabular-nums ${item.shareEstoqueFull >= 50 ? "text-emerald font-semibold" : "text-muted-foreground"}`}>
          {item.shareEstoqueFull.toFixed(0)}%
        </td>
        <td className="py-2 px-2 text-right">
          {item.qualityScore !== null ? (
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums ${ipiColor}`}>
              {item.qualityScore.toFixed(0)}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
        <td className="py-2 px-2 text-center text-xs">
          {item.flagOptinCdp ? (
            <span title="Opt-in CDP ativo">🎯</span>
          ) : (
            <span className="text-muted-foreground" title="Sem opt-in">○</span>
          )}
          {item.flagBestPromo && <span title="Best promo" className="ml-1">⭐</span>}
        </td>
      </tr>
      {aberto && (
        <tr className="bg-muted/20">
          <td colSpan={8} className="px-4 py-3">
            <div className="space-y-1.5">
              {item.acoes.length > 0 ? (
                item.acoes.map((a, i) => (
                  <p key={i} className="text-[11px] flex items-start gap-1.5 text-foreground">
                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-warning" />
                    <span>{a}</span>
                  </p>
                ))
              ) : (
                <p className="text-[11px] text-emerald">✅ Sem gaps identificados.</p>
              )}
              <p className="text-[10px] text-muted-foreground pt-1">
                Estoque Full: <span className="font-mono tabular-nums">{item.estoqueFull.toFixed(0)} un</span> ({item.shareEstoqueFull.toFixed(0)}%)
                {item.diasEstoque !== null && item.diasEstoque < 999 && (
                  <> · Cobertura: <span className="font-mono tabular-nums">{item.diasEstoque} dias</span></>
                )}
                {" · "}
                Desconto seller: <span className="font-mono tabular-nums">{item.descontoSellerPct.toFixed(0)}%</span>
                {item.qualityScore !== null && (
                  <>
                    {" · "}Fotos <span className="font-mono">{(item.scoreFotos ?? 0).toFixed(0)}</span>
                    {" · "}Título <span className="font-mono">{(item.scoreTitulo ?? 0).toFixed(0)}</span>
                    {" · "}Ficha <span className="font-mono">{(item.scoreFicha ?? 0).toFixed(0)}</span>
                  </>
                )}
              </p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ResumoOportunidades({ itens }: { itens: MLBPerformance[] }) {
  const qualidade = itens.filter((i) => i.diagnostico === "qualidade").length;
  const visib = itens.filter((i) => i.diagnostico === "visibilidade").length;
  const parado = itens.filter((i) => i.diagnostico === "estoque_parado").length;
  const unParadas = itens
    .filter((i) => i.statusGiro === "parado" || i.statusGiro === "lento")
    .reduce((a, i) => a + i.estoqueMedio, 0);

  const cards = [
    { label: "Gap de qualidade", valor: qualidade, color: "text-destructive", desc: "score ou ficha a corrigir" },
    { label: "Sem visibilidade", valor: visib, color: "text-orange-500", desc: "itens sem CDP e vendas baixas" },
    { label: "Estoque parado", valor: parado, color: "text-warning", desc: "itens com capital imobilizado" },
    { label: "Un. sem girar", valor: Math.round(unParadas), color: "text-muted-foreground", desc: "itens parados ou lentos" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.valor}</p>
          <p className="text-[10px] text-muted-foreground">{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

interface Props {
  sellerId?: string;
}

export default function ConversaoPorMLBPanel({ sellerId }: Props) {
  const [filtro, setFiltro] = useState<"todos" | "problemas">("problemas");
  const [ordem, setOrdem] = useState<"prioridade" | "pedidos" | "estoque">("prioridade");

  const { data: rawItens, isLoading } = useQuery({
    queryKey: ["mlb-proxy", sellerId],
    queryFn: () => fetchMLBPerformance(sellerId!),
    enabled: !!sellerId,
  });

  const itens = useMemo(() => {
    if (!rawItens) return [];
    const filtered = filtro === "problemas" ? rawItens.filter((r) => r.diagnostico !== "ok") : rawItens;
    return [...filtered].sort((a, b) => {
      if (ordem === "pedidos") return b.pedidos7d - a.pedidos7d;
      if (ordem === "estoque") return b.estoqueMedio - a.estoqueMedio;
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      if (a.diagnostico !== b.diagnostico) return DIAG_ORDER[a.diagnostico] - DIAG_ORDER[b.diagnostico];
      return b.pedidos7d - a.pedidos7d;
    });
  }, [rawItens, filtro, ordem]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-4"
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Performance por Anúncio
            </h3>
            <TooltipInfo text="Diagnóstico por MLB usando dias de estoque (estoque ÷ média diária de vendas) cruzado com qualidade do anúncio." />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Baseado em giro (dias de estoque) e qualidade — fonte: <code className="px-1 rounded bg-muted">seller_eligibility</code> + <code className="px-1 rounded bg-muted">seller_listings_quality</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="text-xs border border-border bg-background rounded px-2 py-1"
          >
            <option value="problemas">Só com gaps</option>
            <option value="todos">Todos os itens</option>
          </select>
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as any)}
            className="text-xs border border-border bg-background rounded px-2 py-1"
          >
            <option value="prioridade">Por prioridade</option>
            <option value="pedidos">Por pedidos</option>
            <option value="estoque">Por estoque</option>
          </select>
        </div>
      </div>

      {/* Nota de metodologia */}
      <div className="flex items-start gap-2 p-3 rounded-md border border-border/60 bg-muted/10 text-[11px]">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Como funciona:</span> visitas por anúncio não estão no CSV diarizado.
          O painel usa <span className="font-semibold">dias de estoque</span> (estoque ÷ média diária de vendas) como sinal de giro — mais acionável que taxa de conversão para decisões de reposição e promoção.
          Quando há linha em <code className="px-1 rounded bg-muted">seller_listings_quality</code>, o score (fotos+título+ficha) refina o diagnóstico.
        </p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>🔴 Gap de qualidade</span>
        <span>🟠 Sem visibilidade (CDP)</span>
        <span>🟡 Estoque parado</span>
        <span>⚪ Sem dados de qualidade</span>
        <span>✅ Sem gap</span>
      </div>

      {/* Tabela ou estado vazio */}
      {isLoading ? (
        <div className="text-center text-sm text-muted-foreground py-8">Carregando…</div>
      ) : !sellerId ? (
        <div className="text-center text-sm text-muted-foreground py-8">Selecione um seller.</div>
      ) : itens.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          {filtro === "problemas"
            ? "Nenhum gap identificado — todos os itens com estoque estão girando. 🎉"
            : "Nenhum item de elegibilidade disponível para este seller."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2 font-semibold">Anúncio</th>
                <th className="text-right py-2 px-2 font-semibold">Pedidos 7d</th>
                <th className="text-center py-2 px-2 font-semibold">Giro</th>
                <th className="text-right py-2 px-2 font-semibold">Dias estoque</th>
                <th className="text-right py-2 px-2 font-semibold">Estoque</th>
                <th className="text-right py-2 px-2 font-semibold">Full %</th>
                <th className="text-right py-2 px-2 font-semibold">Score</th>
                <th className="text-center py-2 px-2 font-semibold">CDP</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <ItemRow key={item.itemId} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumo */}
      {rawItens && rawItens.length > 0 && <ResumoOportunidades itens={rawItens} />}
    </motion.div>
  );
}