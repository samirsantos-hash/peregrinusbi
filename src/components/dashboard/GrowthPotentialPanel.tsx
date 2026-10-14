import { numCurto } from "@/lib/format";
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
import { useCategoryMix } from "@/hooks/useCategoryMix";
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
  sellerId?: string;
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


const GrowthPotentialPanel = ({ kpis, campaign, benchmark, sellerId }: GrowthPotentialPanelProps) => {
  const { data: mix } = useCategoryMix(sellerId);
  const [modoCurva, setModoCurva] = useState<"acumulado" | "indexado">("acumulado");
  const verticalRotulo = campaign?.verticalPrincipal?.trim() || null;

  // Série mensal do seller, sem o mês corrente (incompleto).
  const sellerMensal = useMemo(() => {
    const atual = new Date().toISOString().slice(0, 7);
    const m = new Map<string, number>();
    for (const k of kpis) {
      const mes = String(k.date).slice(0, 7);
      if (mes >= atual) continue;
      m.set(mes, (m.get(mes) ?? 0) + (k.revenue || 0));
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [kpis]);
  const meses = sellerMensal.map(([m]) => m);

  const { data: refData, isLoading: refLoading } = useQuery({
    queryKey: ["ref-vertical", sellerId, verticalRotulo, meses[0], meses[meses.length - 1]],
    enabled: !!sellerId && !!verticalRotulo && meses.length > 0,
    queryFn: async () => {
      const { data: camp } = await fetchAllRows<{ seller_id: string }>((f, t) =>
        supabase.from("meli_campaigns" as any).select("seller_id")
          .eq("vertical_principal", verticalRotulo!).order("seller_id").range(f, t) as any,
      );
      const ids = [...new Set(camp.map((r) => r.seller_id))].filter((id) => id && id !== sellerId);
      const linhas: LinhaPar[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { data } = await fetchAllRows<any>((f, t) =>
          supabase.from("sellers_kpi").select("seller_id, data, tgmv_lc")
            .in("seller_id", lote)
            .gte("data", `${meses[0]}-01`).lte("data", `${meses[meses.length - 1]}-31`)
            .order("seller_id").order("data").range(f, t) as any,
        );
        for (const r of data) linhas.push({ seller_id: r.seller_id, mes: String(r.data).slice(0, 7), tgmv: Number(r.tgmv_lc) || 0 });
      }
      return calcularReferenciaVertical(sellerId!, meses, linhas);
    },
  });

  const referenciaValida = !!verticalRotulo && !!refData && refData.nPares >= MIN_PARES;
  const motivoSemRef = !verticalRotulo
    ? "Este seller não tem Vertical Principal cadastrada, então não há pares para comparar."
    : refLoading
    ? null
    : `Menos de ${MIN_PARES} sellers da carteira com dados válidos na vertical ${verticalRotulo}.`;

  const { chartData, sellerTotal, benchmarkTotal, baseInfo } = useMemo(() => {
    const nBase = Math.min(3, sellerMensal.length);
    const baseSeller = nBase ? sellerMensal.slice(0, nBase).reduce((s, [, v]) => s + v, 0) / nBase : 0;
    const baseValida = baseSeller > 0 && Number.isFinite(baseSeller);
    let cumS = 0;
    let cumR = 0;
    const data = sellerMensal.map(([mes, v], i) => {
      const p = referenciaValida ? refData!.pontos[i] : null;
      cumS += v;
      const refMes = p?.mediana != null ? (baseSeller * p.mediana) / 100 : null;
      if (refMes != null) cumR += refMes;
      return {
        date: formatChartDate(`${mes}-01`, "consolidated"),
        "Seller (Acumulado)": Math.round(cumS),
        "Referência da vertical": referenciaValida && refMes != null ? Math.round(cumR) : null,
        "Seller (Índice)": baseValida ? Math.round((v / baseSeller) * 100) : null,
        "Mediana da vertical (Índice)": p?.mediana != null ? Math.round(p.mediana) : null,
        "Faixa P25–P75": p?.p25 != null && p?.p75 != null ? [Math.round(p.p25), Math.round(p.p75)] : null,
      };
    });
    return {
      chartData: data,
      sellerTotal: cumS,
      benchmarkTotal: cumR,
      baseInfo: { seller: baseSeller, pontos: nBase, valida: baseValida },
    };
  }, [sellerMensal, refData, referenciaValida]);


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

    // 2. ROAS — mediana da vertical (sellers com inv > 0)
    if (benchmark?.medianRoas && benchmark.medianRoas > 0) {
      list.push({
        id: "roas", label: "ROAS",
        valorSeller: sellerRoas, medianaVertical: benchmark.medianRoas,
        indice: (sellerRoas / benchmark.medianRoas) * 100,
        unidade: "x", sentido: "maior_melhor", fonte: "vertical",
        tooltipKey: "roas",
      });
    }

    // 3. ACOS — menor é melhor; mediana da vertical
    if (benchmark?.medianAcos && benchmark.medianAcos > 0 && sellerAcos > 0) {
      list.push({
        id: "acos", label: "ACOS",
        valorSeller: sellerAcos, medianaVertical: benchmark.medianAcos,
        indice: (sellerAcos / benchmark.medianAcos) * 100,
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
    if (u === "%") return `${v.toFixed(1).replace(".", ",")}%`;
    if (u === "x") return `${v.toFixed(2).replace(".", ",")}x`;
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
                        {delta >= 0 ? "+" : ""}{delta.toFixed(0).replace(".", ",")}%
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
        <div className="glass-card p-4 border border-ec-laranja/30 bg-ec-laranja/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-ec-laranja shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold text-ec-laranja">
                ⚠️ Dimensão mais fraca: {dimensaoMaisFraca.label}
              </span>{" "}
              <span className="font-mono">
                ({indiceParaDelta(dimensaoMaisFraca.indice, dimensaoMaisFraca.sentido).toFixed(0).replace(".", ",")}% vs mediana)
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
            <Badge variant="outline" className="text-[10px] font-normal border-ec-ambar/40 text-ec-ambar">
              Vertical não identificada para este seller
            </Badge>
          )}
          {fonteBenchmark === "estimativa" && (
            <Badge variant="outline" className="text-[10px] font-normal border-ec-ambar/40 text-ec-ambar">
              Curva da vertical é estimativa, não dado de mercado
            </Badge>
          )}
          {modoCurva === "indexado" && baseInfo?.valida && (
            <Badge variant="outline" className="text-[10px] font-normal">
              Base: {fmtBRLCompact(baseInfo.seller)} (média de {baseInfo.pontos} pontos)
            </Badge>
          )}
        </div>

        {/* Resumo do gap no período */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {[
            { label: "Seller no período", valor: fmtBRLCompact(sellerTotal), cor: "text-foreground" },
            { label: "Referência da vertical", valor: fmtBRLCompact(benchmarkTotal), cor: "text-ec-ambar" },
            {
              label: "Gap (oportunidade)",
              valor:
                benchmarkTotal > 0
                  ? `${fmtBRLCompact(Math.abs(benchmarkTotal - sellerTotal))} (${(
                      ((sellerTotal - benchmarkTotal) / benchmarkTotal) * 100
                    ).toFixed(1).replace(".", ",")}%)`
                  : "—",
              cor: sellerTotal >= benchmarkTotal ? "text-ok" : "text-destructive",
            },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className={`text-sm font-bold font-mono tabular-nums ${c.cor}`}>{c.valor}</p>
            </div>
          ))}
        </div>

        {modoCurva === "indexado" && curvaProporcional && (
          <div className="mb-3 rounded-md border border-ec-ambar/30 bg-ec-ambar/5 px-3 py-2 text-[11px] text-ec-ambar">
            A referência da vertical é obtida aplicando um índice fixo ao próprio faturamento do seller.
            No modo indexado as duas curvas são matematicamente idênticas, então mostramos apenas a do
            seller — o gap só faz sentido no modo Acumulado (R$).
          </div>
        )}

        {modoCurva === "indexado" && !baseInfo?.valida ? (
          <div className="flex h-[320px] items-center justify-center rounded-md border border-ec-ambar/30 bg-ec-ambar/5 px-6 text-center text-xs text-ec-ambar">
            Base de cálculo igual a zero nos primeiros pontos da janela — o índice não pode ser calculado
            (divisão por zero). Use o modo Acumulado (R$) ou amplie o período.
          </div>
        ) : (

        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradSellerGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={deltaGeral >= 10 ? "hsl(var(--ok))" : "hsl(var(--ec-verde))"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={deltaGeral >= 10 ? "hsl(var(--ok))" : "hsl(var(--ec-verde))"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--ec-ambar))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--ec-ambar))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--grid))" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--ec-text-sec))", fontSize: 11 }}
              axisLine={false}
              interval="preserveStartEnd"
              angle={chartData.length > 8 ? -45 : 0}
              textAnchor={chartData.length > 8 ? "end" : "middle"}
              height={chartData.length > 8 ? 50 : 30}
            />
            <YAxis
              tick={{ fill: "hsl(var(--ec-text-sec))", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) =>
                modoCurva === "indexado"
                  ? String(v)
                  : numCurto(v)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {!(modoCurva === "indexado" && curvaProporcional) && (
              <Area
                type="monotone"
                dataKey={modoCurva === "indexado" ? "Vertical (Índice)" : "Benchmark Vertical"}
                stroke="hsl(var(--ec-ambar))"
                fill="url(#gradBenchmark)"
                strokeWidth={2}
                strokeDasharray="6 3"
                connectNulls={false}
                animationDuration={800}
                animationEasing="ease-in-out"
              />
            )}
            <Area
              type="monotone"
              dataKey={modoCurva === "indexado" ? "Seller (Índice)" : "Seller (Acumulado)"}
              stroke={deltaGeral >= 10 ? "hsl(var(--ok))" : "hsl(var(--ec-verde))"}
              fill="url(#gradSellerGrowth)"
              strokeWidth={2.5}
              connectNulls={false}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
            <Legend wrapperStyle={{ color: "hsl(var(--ec-text-sec))", fontSize: 12 }} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* ── Percentual por categoria ─────────────────────────────────────── */}
      {!!mix?.categorias?.length && (
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Percentual por categoria
            </h3>
            <TooltipInfo text="Participação de cada categoria no total de anúncios ativos do seller, no snapshot mais recente de anúncios." />
            <Badge variant="outline" className="text-[10px] font-normal ml-auto">
              {mix.totalItens.toLocaleString("pt-BR")} itens ativos
              {mix.data ? ` · ${mix.data.slice(8, 10)}/${mix.data.slice(5, 7)}/${mix.data.slice(0, 4)}` : ""}
            </Badge>
          </div>

          <div className="mt-4 space-y-2.5">
            {mix.categorias.slice(0, 12).map((c) => (
              <div key={c.categoria}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-xs text-foreground truncate">{c.categoria}</span>
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                    {c.itens.toLocaleString("pt-BR")} itens ·{" "}
                    <span className="font-bold text-foreground">{c.pct.toFixed(1).replace(".", ",")}%</span>
                  </span>
                </div>
                <div className="relative w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(c.pct, 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
            {mix.categorias.length > 12 && (
              <p className="text-[10px] text-muted-foreground pt-1">
                + {mix.categorias.length - 12} categorias com participação menor.
              </p>
            )}
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default GrowthPotentialPanel;
