import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { Badge } from "@/components/ui/badge";
import { fmtBRLCompact, formatChartDate } from "@/utils/formatters";
import type { SellerCampaign } from "@/hooks/useMeliCampaigns";
import type { VerticalBenchmark } from "@/hooks/useVerticalBenchmark";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import {
  statusPorDelta,
  corPorDelta,
  labelPorDelta,
  indiceParaDelta,
  type Sentido,
} from "@/lib/verticalStatus";

interface KpiLike {
  date: string;
  gmv: number;
  revenue: number;
  cdpTgmv: number;
  upliftGmvM1: number;
  gmvM1: number;
  // optional fields used by the 6-dimension matrix
  roas?: number;
  acos?: number;
  tsi?: number;
  visits?: number;
  pctFull?: number;
  repClaimsRate?: number;
  repDelayedRate?: number;
  adsInvestment?: number;
  tgmvPads?: number;
}

interface GrowthPotentialPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
  campaign?: SellerCampaign | null;
  benchmark?: VerticalBenchmark | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => {
        const indexado = typeof p.name === "string" && p.name.includes("Índice");
        return (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}:{" "}
            {typeof p.value !== "number"
              ? "—"
              : indexado
              ? `${p.value} (base 100)`
              : fmtBRLCompact(p.value)}
          </p>
        );
      })}
    </div>
  );
};


const GrowthPotentialPanel = ({ kpis, dataGranularity = "daily", campaign, benchmark }: GrowthPotentialPanelProps) => {
  // Primary source: Efect Rta Vertical from meli_campaigns
  const hasCampaignData = !!campaign && campaign.efectRtaVertical > 0;
  const [modoCurva, setModoCurva] = useState<"acumulado" | "indexado">("acumulado");

  // Procedência declarada do benchmark (elo 1 da auditoria)
  const verticalRotulo = campaign?.verticalPrincipal?.trim() || null;
  const fonteBenchmark: "efect_rta" | "cdp" | "estimativa" = hasCampaignData
    ? "efect_rta"
    : kpis.some((k) => (k.cdpTgmv || 0) > 0)
    ? "cdp"
    : "estimativa";
  const rotuloFonte =
    fonteBenchmark === "efect_rta"
      ? `Índice Efect Rta da vertical${verticalRotulo ? ` (${verticalRotulo})` : ""}`
      : fonteBenchmark === "cdp"
      ? "Faturamento CDP do próprio seller (proxy)"
      : "Estimativa derivada do uplift (dado frágil)";

  const {
    chartData,
    sellerTotal,
    benchmarkTotal,
    baseInfo,
  } = useMemo(() => {
    if (kpis.length === 0) {
      return { chartData: [], sellerTotal: 0, benchmarkTotal: 0, baseInfo: null as null | { seller: number; bench: number; pontos: number; valida: boolean } };
    }

    // If we have campaign data, use efectRtaVertical as the potentialPct directly
    const efectPct = hasCampaignData ? campaign!.efectRtaVertical : 0;

    const byDate: Record<string, { sellerGmv: number; benchmarkGmv: number }> = {};

    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { sellerGmv: 0, benchmarkGmv: 0 };
      byDate[k.date].sellerGmv += k.revenue;

      if (hasCampaignData) {
        // Benchmark = seller revenue / (efectRtaVertical / 100) — reverse-engineer category potential
        const benchmarkRevenue = efectPct > 0 ? k.revenue / (efectPct / 100) : k.revenue;
        byDate[k.date].benchmarkGmv += benchmarkRevenue;
      } else {
        const cdp = k.cdpTgmv || 0;
        if (cdp > 0) {
          byDate[k.date].benchmarkGmv += cdp;
        } else {
          const uplift = k.upliftGmvM1 || 0;
          const estimated = k.revenue * (1 + Math.abs(uplift) * 0.5 + 0.15);
          byDate[k.date].benchmarkGmv += estimated;
        }
      }
    }

    const sortedDates = Object.keys(byDate).sort();

    // Base do índice = média dos 3 primeiros pontos (nunca um mês único).
    const nBase = Math.min(3, sortedDates.length);
    const baseSeller =
      sortedDates.slice(0, nBase).reduce((s, d) => s + byDate[d].sellerGmv, 0) / nBase;
    const baseBench =
      sortedDates.slice(0, nBase).reduce((s, d) => s + byDate[d].benchmarkGmv, 0) / nBase;
    const baseValida = baseSeller > 0 && baseBench > 0 && Number.isFinite(baseSeller) && Number.isFinite(baseBench);

    let cumSeller = 0;
    let cumBenchmark = 0;
    const data = sortedDates.map((date) => {
      cumSeller += byDate[date].sellerGmv;
      cumBenchmark += byDate[date].benchmarkGmv;
      const label = formatChartDate(date, dataGranularity);
      return {
        date: label,
        "Seller (Acumulado)": Math.round(cumSeller),
        "Benchmark Vertical": Math.round(cumBenchmark),
        // Índice base 100 — só calculado quando a base é válida (base 0 nunca vira Infinity)
        "Seller (Índice)": baseValida ? Math.round((byDate[date].sellerGmv / baseSeller) * 100) : null,
        "Vertical (Índice)": baseValida ? Math.round((byDate[date].benchmarkGmv / baseBench) * 100) : null,
      };
    });

    return {
      chartData: data,
      sellerTotal: cumSeller,
      benchmarkTotal: cumBenchmark,
      baseInfo: { seller: baseSeller, bench: baseBench, pontos: nBase, valida: baseValida },
    };
  }, [kpis, hasCampaignData, campaign, dataGranularity]);


  // ---------------------------------------------------------------
  // 6 dimensões vs categoria (com índice relativo à mediana ou referência)
  // ---------------------------------------------------------------
  type Dimensao = {
    id: string;
    label: string;
    valorSeller: number;
    medianaVertical: number;
    indice: number;             // valorSeller / mediana * 100
    unidade: "R$" | "%" | "x" | "pts";
    sentido: Sentido;
    fonte: "vertical" | "referência";
    tooltipKey?: string;
  };

  const dims: Dimensao[] = useMemo(() => {
    if (!kpis.length) return [];
    const totalGmv = kpis.reduce((s, k) => s + (k.gmv || 0), 0);
    const totalRevenue = kpis.reduce((s, k) => s + (k.revenue || 0), 0);
    const totalAds = kpis.reduce((s, k) => s + (k.adsInvestment || 0), 0);
    const totalTgmvPads = kpis.reduce((s, k) => s + (k.tgmvPads || 0), 0);
    const totalTsi = kpis.reduce((s, k) => s + (k.tsi || 0), 0);
    const totalVisits = kpis.reduce((s, k) => s + (k.visits || 0), 0);

    const sellerRoas = totalAds > 0 ? totalTgmvPads / totalAds : 0;
    const sellerAcos = totalTgmvPads > 0 ? (totalAds / totalTgmvPads) * 100 : 0;
    const sellerConv = totalVisits > 0 ? (totalTsi / totalVisits) * 100 : 0;
    const sellerFull = kpis.reduce((s, k) => s + (k.pctFull || 0), 0) / kpis.length;
    // repClaimsRate e repDelayedRate vêm como frações (0-1). Converter soma média para % antes de comparar com mediana em %.
    const sellerRep =
      (kpis.reduce((s, k) => s + (k.repClaimsRate || 0) + (k.repDelayedRate || 0), 0) /
        Math.max(1, kpis.length)) * 100;

    const list: Dimensao[] = [];

    // 1. GMV — usa efectRtaVertical (que JÁ é o índice do seller vs vertical)
    if (campaign?.efectRtaVertical && campaign.efectRtaVertical > 0) {
      const baseGmv = totalGmv || totalRevenue;
      const medianaGmv = baseGmv > 0 ? baseGmv / (campaign.efectRtaVertical / 100) : 0;
      list.push({
        id: "gmv", label: "GMV",
        valorSeller: baseGmv, medianaVertical: medianaGmv,
        indice: campaign.efectRtaVertical,
        unidade: "R$", sentido: "maior_melhor", fonte: "vertical",
      });
    }

    // 2. ROAS — usa benchmark.avgRoas como mediana real da vertical
    if (benchmark?.avgRoas && benchmark.avgRoas > 0) {
      list.push({
        id: "roas", label: "ROAS",
        valorSeller: sellerRoas, medianaVertical: benchmark.avgRoas,
        indice: (sellerRoas / benchmark.avgRoas) * 100,
        unidade: "x", sentido: "maior_melhor", fonte: "vertical",
        tooltipKey: "roas",
      });
    }

    // 3. ACOS — menor é melhor; benchmark.avgAcos é mediana da vertical
    if (benchmark?.avgAcos && benchmark.avgAcos > 0 && sellerAcos > 0) {
      list.push({
        id: "acos", label: "ACOS",
        valorSeller: sellerAcos, medianaVertical: benchmark.avgAcos,
        indice: (sellerAcos / benchmark.avgAcos) * 100,
        unidade: "%", sentido: "menor_melhor", fonte: "vertical",
        tooltipKey: "acos",
      });
    }

    // 4. Share Full — referência do algoritmo MELI (≥ 60%)
    list.push({
      id: "full_pct", label: "Share Full",
      valorSeller: sellerFull, medianaVertical: 60,
      indice: sellerFull > 0 ? (sellerFull / 60) * 100 : 0,
      unidade: "%", sentido: "maior_melhor", fonte: "referência",
      tooltipKey: "shareFullPct",
    });

    // 5. Conversão (TSI / Visitas) — referência 5%
    list.push({
      id: "conversao", label: "Taxa de Conversão",
      valorSeller: sellerConv, medianaVertical: 5,
      indice: sellerConv > 0 ? (sellerConv / 5) * 100 : 0,
      unidade: "%", sentido: "maior_melhor", fonte: "referência",
    });

    // 6. Reputação (Claims + Atrasos) — menor é melhor, ref ≤ 5%
    if (sellerRep > 0) {
      list.push({
        id: "reputacao", label: "Reputação (Claims + Atrasos)",
        valorSeller: sellerRep, medianaVertical: 5,
        indice: (sellerRep / 5) * 100,
        unidade: "%", sentido: "menor_melhor", fonte: "referência",
      });
    }

    return list;
  }, [kpis, campaign, benchmark]);

  // Pesos do índice geral ponderado
  const PESOS: Record<string, number> = {
    gmv: 0.25, conversao: 0.20, reputacao: 0.20,
    full_pct: 0.15, acos: 0.10, roas: 0.10,
  };

  // Delta ponderado vs mediana: 0% = na mediana, +X% = acima, -X% = abaixo.
  const deltaGeral = useMemo(() => {
    if (!dims.length) return 0;
    let somaPeso = 0;
    let somaPond = 0;
    for (const d of dims) {
      const peso = PESOS[d.id] ?? 0;
      if (peso === 0) continue;
      const delta = indiceParaDelta(d.indice, d.sentido);
      somaPond += delta * peso;
      somaPeso += peso;
    }
    return somaPeso > 0 ? Math.round(somaPond / somaPeso) : 0;
  }, [dims]);

  const status = statusPorDelta(deltaGeral);

  const dimensaoMaisFraca = useMemo(() => {
    if (!dims.length) return null;
    return [...dims].sort(
      (a, b) => indiceParaDelta(a.indice, a.sentido) - indiceParaDelta(b.indice, b.sentido)
    )[0];
  }, [dims]);

  const temGapOculto = deltaGeral >= 10 && dims.some(d => indiceParaDelta(d.indice, d.sentido) < -20);

  if (kpis.length === 0) {
    return (
      <div className="glass-card p-5 text-center text-muted-foreground text-sm">
        Dados insuficientes para análise de potencial de crescimento.
      </div>
    );
  }

  const formatValor = (v: number, u: Dimensao["unidade"]) => {
    if (u === "R$") return fmtBRLCompact(v);
    if (u === "%") return `${v.toFixed(1)}%`;
    if (u === "x") return `${v.toFixed(2)}x`;
    return `${v.toFixed(1)} pts`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* ── Header: índice geral vs categoria ─────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Efetividade vs Categoria
              </h3>
              <AlgoTooltip tooltipKey="efetividadeCategoria" />
            </div>
            {campaign?.verticalPrincipal && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Categoria: <span className="font-semibold text-foreground">{campaign.verticalPrincipal}</span>
                {benchmark?.sellersCount ? (
                  <> · {benchmark.sellersCount} sellers comparados</>
                ) : null}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div
                className="text-4xl font-bold font-mono tabular-nums leading-none"
                style={{ color: status.cor }}
              >
                {deltaGeral >= 0 ? "+" : ""}{deltaGeral}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">vs mediana</div>
            </div>
            <Badge
              className={`border ${status.borderClass} ${status.textClass} ${status.bgClass}`}
              variant="outline"
            >
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Interpretação contextual */}
        <div className={`mt-4 rounded-lg border p-4 ${status.bgClass} ${status.borderClass}`}>
          <p className="text-sm text-foreground">{status.interpretacao}</p>
          <p className={`text-xs mt-2 ${status.textClass}`}>
            <span className="font-semibold">💡 O que fazer:</span>{" "}
            <span className="text-muted-foreground">{status.acaoSugerida}</span>
          </p>
        </div>
      </div>

      {/* ── Alerta de mascaramento (delta geral positivo esconde dimensão crítica) ── */}
      {temGapOculto && (
        <div className="glass-card p-4 border border-warning/30 bg-warning/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold text-warning">Atenção:</span> o resultado geral de{" "}
              <span className="font-mono font-bold">+{deltaGeral}%</span> está sendo puxado por
              dimensões fortes, mas há pelo menos uma dimensão com gap superior a 20% abaixo da
              mediana. O número geral está mascarando um problema — ver barras abaixo.
            </p>
          </div>
        </div>
      )}

      {/* ── 6 dimensões individuais ──────────────────────────────────────── */}
      {dims.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Dimensões vs Categoria
            </h3>
            <TooltipInfo text="Cada dimensão mostra o desempenho do seller comparado à referência da categoria. A linha central representa a mediana (100%); a barra mostra o índice do seller. Valores abaixo de 90% indicam desvantagem; acima de 110%, vantagem leve." />
          </div>

          <div className="space-y-4">
            {/* Legenda do eixo */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>← abaixo da mediana</span>
              <span className="font-semibold text-foreground">Mediana = 0%</span>
              <span>acima da mediana →</span>
            </div>

            {dims.map((d) => {
              const delta = indiceParaDelta(d.indice, d.sentido);
              const cor = corPorDelta(delta);
              const lbl = labelPorDelta(delta);
              // 1pp de delta = 1pp de barra; clamp em ±50pp para caber no trilho (50% cada lado).
              const BAR_SCALE = 1;
              const barWidth = Math.min(Math.abs(delta) * BAR_SCALE, 50);
              const barLeft  = delta >= 0 ? 50 : 50 - barWidth;

              return (
                <div key={d.id} className="bg-muted/20 rounded-lg p-3 border border-border/40">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{d.label}</span>
                      {d.tooltipKey && <AlgoTooltip tooltipKey={d.tooltipKey as any} />}
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1.5 border-border/60 text-muted-foreground"
                      >
                        {d.fonte === "vertical" ? "mediana da vertical" : "referência algoritmo"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 text-[11px]">
                      <span className="font-mono font-bold text-foreground tabular-nums">
                        {formatValor(d.valorSeller, d.unidade)}
                      </span>
                      <span className="text-muted-foreground">
                        vs {formatValor(d.medianaVertical, d.unidade)}
                      </span>
                      <span
                        className="font-mono font-bold tabular-nums"
                        style={{ color: cor }}
                      >
                        {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
                      </span>
                      <span className="text-[10px]" style={{ color: cor }}>
                        {lbl}
                      </span>
                    </div>
                  </div>

                  {/* Trilho centrado na mediana (50% = 0% delta). Barra cresce para o lado correspondente. */}
                  <div className="relative w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute top-0 bottom-0 rounded-sm"
                      style={{ background: cor, left: `${barLeft}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                    {/* Linha vertical da mediana (= 0% delta) */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-foreground/60"
                      style={{ left: "50%" }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>−50%</span>
                    <span>mediana (0%)</span>
                    <span>+50%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alerta da dimensão mais fraca ────────────────────────────────── */}
      {dimensaoMaisFraca && indiceParaDelta(dimensaoMaisFraca.indice, dimensaoMaisFraca.sentido) < -10 && (
        <div className="glass-card p-4 border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold text-orange-500">
                ⚠️ Dimensão mais fraca: {dimensaoMaisFraca.label}
              </span>{" "}
              <span className="font-mono">
                ({indiceParaDelta(dimensaoMaisFraca.indice, dimensaoMaisFraca.sentido).toFixed(0)}% vs mediana)
              </span>.{" "}
              <span className="text-muted-foreground">
                {dimensaoMaisFraca.id === "full_pct" && "Sellers da categoria operam com mais Full em média — desvantagem logística direta no algoritmo."}
                {dimensaoMaisFraca.id === "conversao" && "Taxa de conversão abaixo dos pares — investigar preço, fotos e CDP antes de aumentar Ads."}
                {dimensaoMaisFraca.id === "reputacao" && "Reputação abaixo da mediana da categoria — freio estrutural. Corrigir antes de qualquer outra ação."}
                {dimensaoMaisFraca.id === "roas" && "ROAS abaixo dos pares — revisar segmentação de Ads e qualidade dos anúncios."}
                {dimensaoMaisFraca.id === "acos" && "ACOS acima dos pares — verba de Ads gerando retorno menor que o da categoria."}
                {dimensaoMaisFraca.id === "gmv" && "GMV abaixo da mediana da categoria — verificar os outros pilares para identificar a causa raiz."}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Cumulative / indexed growth chart */}
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {modoCurva === "acumulado"
              ? "Faturamento acumulado no período: Seller vs Referência da vertical"
              : `Evolução indexada — Seller vs Vertical (base 100 = média dos ${baseInfo?.pontos ?? 3} primeiros pontos)`}
          </h3>
          <TooltipInfo text={
            "Como ler este gráfico:\n\n" +
            "MODO ACUMULADO (R$): soma o faturamento ponto a ponto — a curva nunca desce, por construção. Serve para dimensionar o gap em reais, NÃO para comparar trajetórias de crescimento.\n\n" +
            "MODO INDEXADO (base 100): cada ponto é o valor do período dividido pela média dos 3 primeiros pontos da janela. Pode subir e descer, e é a leitura correta de crescimento. A base é uma média (não um mês único) justamente para não inflar a curva com um mês atípico.\n\n" +
            "Curva tracejada (amarela) = referência da vertical, derivada da fonte declarada abaixo do título. Ela NÃO é hoje uma coorte fixa de sellers da vertical — é reconstruída a partir do índice da categoria aplicado ao próprio seller.\n\n" +
            "Como interpretar o gap:\n" +
            "• Seller ACIMA da referência ⇒ ganho de share dentro da categoria.\n" +
            "• Seller ABAIXO ⇒ receita não capturada; no modo acumulado a distância vertical em R$ é o tamanho aproximado da oportunidade.\n" +
            "• Curvas divergindo ⇒ tendência estrutural. Curvas paralelas ⇒ posição estável.\n\n" +
            "Para agir: comece pela dimensão mais fraca acima (Reputação ⇒ Share Full ⇒ Conversão ⇒ ROAS/ACOS)."
          } />
          <div className="ml-auto flex rounded-md border border-border overflow-hidden">
            {(["acumulado", "indexado"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModoCurva(m)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  modoCurva === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "acumulado" ? "Acumulado (R$)" : "Indexado (100)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] font-normal">
            Referência: {rotuloFonte}
          </Badge>
          {!verticalRotulo && (
            <Badge variant="outline" className="text-[10px] font-normal border-amber-500/40 text-amber-400">
              Vertical não identificada para este seller
            </Badge>
          )}
          {fonteBenchmark === "estimativa" && (
            <Badge variant="outline" className="text-[10px] font-normal border-amber-500/40 text-amber-400">
              Curva da vertical é estimativa, não dado de mercado
            </Badge>
          )}
          {modoCurva === "indexado" && baseInfo?.valida && (
            <Badge variant="outline" className="text-[10px] font-normal">
              Base: {fmtBRLCompact(baseInfo.seller)} (média de {baseInfo.pontos} pontos)
            </Badge>
          )}
        </div>

        {modoCurva === "indexado" && !baseInfo?.valida ? (
          <div className="flex h-[320px] items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/5 px-6 text-center text-xs text-amber-300">
            Base de cálculo igual a zero nos primeiros pontos da janela — o índice não pode ser calculado
            (divisão por zero). Use o modo Acumulado (R$) ou amplie o período.
          </div>
        ) : (

        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradSellerGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={deltaGeral >= 10 ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={deltaGeral >= 10 ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(40, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={chartData.length > 8 ? -45 : 0}
              textAnchor={chartData.length > 8 ? "end" : "middle"}
              height={chartData.length > 8 ? 50 : 30}
            />
            <YAxis
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) =>
                modoCurva === "indexado"
                  ? String(v)
                  : v >= 1_000_000
                  ? `${(v / 1e6).toFixed(1)}M`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(0)}K`
                  : String(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={modoCurva === "indexado" ? "Vertical (Índice)" : "Benchmark Vertical"}
              stroke="hsl(40, 95%, 55%)"
              fill="url(#gradBenchmark)"
              strokeWidth={2}
              strokeDasharray="6 3"
              connectNulls={false}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
            <Area
              type="monotone"
              dataKey={modoCurva === "indexado" ? "Seller (Índice)" : "Seller (Acumulado)"}
              stroke={deltaGeral >= 10 ? "hsl(160, 84%, 39%)" : "hsl(199, 100%, 50%)"}
              fill="url(#gradSellerGrowth)"
              strokeWidth={2.5}
              connectNulls={false}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
            <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

    </motion.div>
  );
};

export default GrowthPotentialPanel;
