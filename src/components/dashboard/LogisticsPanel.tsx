import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Package, Truck, Mail, TrendingUp, AlertTriangle, CheckCircle2, Boxes, Download, Info } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { AlgoTooltip } from "@/components/ui/AlgoTooltip";
import { fmtBRLCompact, formatChartDate } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { markowitzMinVariance, type AssetSeries } from "@/lib/markowitz";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs">
      <p className="font-medium" style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value.toFixed(1)}%</p>
    </div>
  );
};

const EvolutionTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-card/95 text-xs space-y-1">
      <p className="font-mono text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

interface KpiLike {
  date: string;
  pctFull: number;
  pctFlex: number;
  pctPostagem: number;
  tgmvFull: number;
  tgmvFlex: number;
  tgmv: number;
  productId: string;
}

interface LogisticsPanelProps {
  kpis: KpiLike[];
  dataGranularity?: "consolidated" | "daily";
}

const COLORS = ["hsl(199, 100%, 50%)", "hsl(160, 84%, 39%)", "hsl(280, 80%, 60%)", "hsl(45, 80%, 55%)"];

const LogisticsPanel = ({ kpis, dataGranularity = "daily" }: LogisticsPanelProps) => {
  const latestByProduct = kpis.reduce<Record<string, KpiLike>>((acc, k) => {
    if (!acc[k.productId] || k.date > acc[k.productId].date) acc[k.productId] = k;
    return acc;
  }, {});

  const products = Object.values(latestByProduct);

  // GMV-based share calculation (correct source: CPP_MENSAL fields)
  const totalTgmvFull = products.reduce((s, p) => s + (p.tgmvFull || 0), 0);
  const totalTgmvFlex = products.reduce((s, p) => s + (p.tgmvFlex || 0), 0);
  const totalTgmv = products.reduce((s, p) => s + (p.tgmv || 0), 0);
  const totalTgmvAgencia = Math.max(0, totalTgmv - totalTgmvFull - totalTgmvFlex);

  const shareFullGmv = totalTgmv > 0 ? (totalTgmvFull / totalTgmv) * 100 : 0;
  const shareFlexGmv = totalTgmv > 0 ? (totalTgmvFlex / totalTgmv) * 100 : 0;
  const shareAgenciaGmv = totalTgmv > 0 ? (totalTgmvAgencia / totalTgmv) * 100 : 0;

  // ---------------------------------------------------------------
  // Junior-friendly status per channel (algoritmo MELI: Full > Flex > Agência)
  // ---------------------------------------------------------------
  const statusFull: "ok" | "warn" | "crit" =
    shareFullGmv >= 60 ? "ok" : shareFullGmv >= 30 ? "warn" : "crit";
  const statusFlex: "ok" | "warn" | "crit" =
    shareFlexGmv >= 10 ? "ok" : shareFlexGmv > 0 ? "warn" : "crit";
  const statusAgencia: "ok" | "warn" | "crit" =
    shareAgenciaGmv <= 30 ? "ok" : shareAgenciaGmv <= 50 ? "warn" : "crit";

  const statusColor = (s: "ok" | "warn" | "crit") =>
    s === "ok" ? "text-emerald" : s === "warn" ? "text-warning" : "text-destructive";
  const statusLabel = (s: "ok" | "warn" | "crit") =>
    s === "ok" ? "Saudável" : s === "warn" ? "Atenção" : "Crítico";

  // Estimativa de impacto financeiro: migrar 10pp de Agência para Full
  // Premissa do algoritmo MELI: Full aumenta conversão em ~30% vs Agência
  const migrationPotentialGmv = totalTgmvAgencia * 0.10 * 0.30;
  const showMigrationInsight = shareFullGmv < 60 && shareAgenciaGmv > 20;

  // Time series for evolution chart
  const evolutionData = useMemo(() => {
    const byDate: Record<string, { date: string; tgmvFull: number; tgmvFlex: number; tgmv: number }> = {};
    for (const k of kpis) {
      if (!byDate[k.date]) byDate[k.date] = { date: k.date, tgmvFull: 0, tgmvFlex: 0, tgmv: 0 };
      byDate[k.date].tgmvFull += k.tgmvFull || 0;
      byDate[k.date].tgmvFlex += k.tgmvFlex || 0;
      byDate[k.date].tgmv += k.tgmv || 0;
    }
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const total = d.tgmv || 1;
        const agencia = Math.max(0, d.tgmv - d.tgmvFull - d.tgmvFlex);
        return {
          date: formatChartDate(d.date, dataGranularity),
          "% Full": Math.round((d.tgmvFull / total) * 1000) / 10,
          "% Flex": Math.round((d.tgmvFlex / total) * 1000) / 10,
          "% Agência": Math.round((agencia / total) * 1000) / 10,
        };
      });
  }, [kpis, dataGranularity]);

  const donutData = [
    { name: "Mercado Envios Full", value: Math.round(shareFullGmv * 10) / 10 },
    { name: "Flex", value: Math.round(shareFlexGmv * 10) / 10 },
    { name: "Agência / Coletas", value: Math.round(shareAgenciaGmv * 10) / 10 },
  ];

  const logIcons = [
    {
      label: "Mercado Envios Full",
      value: `${shareFullGmv.toFixed(1)}%`,
      icon: Package,
      color: "neon-text",
      desc: `GMV: ${fmtBRLCompact(totalTgmvFull)}`,
      tooltip: "Share de GMV via Fulfillment (F_TGMV_LC_FULL). Fonte: CPP_MENSAL. Sellers com Full possuem maior conversão e relevância.",
      isEmpty: totalTgmvFull === 0,
      status: statusFull,
    },
    {
      label: "Flex",
      value: `${shareFlexGmv.toFixed(1)}%`,
      icon: Truck,
      color: "emerald-text",
      desc: `GMV: ${fmtBRLCompact(totalTgmvFlex)}`,
      tooltip: "Share de GMV via Flex (F_TGMV_LC_FLEX). Fonte: CPP_MENSAL.",
      isEmpty: totalTgmvFlex === 0,
      status: statusFlex,
    },
    {
      label: "Agência / Coletas",
      value: `${shareAgenciaGmv.toFixed(1)}%`,
      icon: Mail,
      color: "text-purple-400",
      desc: `GMV: ${fmtBRLCompact(totalTgmvAgencia)}`,
      tooltip: "Share de GMV via Agência / Coletas (F_TGMV_LC_COLETAS). Menor priorização no algoritmo.",
      isEmpty: totalTgmvAgencia === 0,
      status: statusAgencia,
    },
  ];

  // ---------------------------------------------------------------
  // Markowitz — Recomendação de envio por produto
  // ---------------------------------------------------------------
  const markowitz = useMemo(() => {
    // Build a date axis common to all products and per-product GMV series.
    const dates = Array.from(new Set(kpis.map((k) => k.date))).sort();
    if (dates.length < 4) return { rows: [], correlation: [] as number[][], ids: [] as string[], dates };
    const byProduct: Record<string, Record<string, number>> = {};
    for (const k of kpis) {
      if (!k.productId) continue;
      byProduct[k.productId] = byProduct[k.productId] || {};
      byProduct[k.productId][k.date] = (byProduct[k.productId][k.date] || 0) + (k.tgmv || 0);
    }
    const ids = Object.keys(byProduct);
    // Keep up to 20 most relevant products by accumulated GMV
    const ranked = ids
      .map((id) => ({
        id,
        total: dates.reduce((s, d) => s + (byProduct[id][d] || 0), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .filter((r) => r.total > 0);

    const series: AssetSeries[] = ranked.map((r) => ({
      id: r.id,
      label: r.id,
      values: dates.map((d) => byProduct[r.id][d] || 0),
    }));

    const bundle = markowitzMinVariance(series);
    return { rows: bundle.rows, correlation: bundle.correlation, ids: bundle.ids, dates };
  }, [kpis]);

  // Capacidade de envio (unidades) — ajustável; default heurístico baseado no GMV/ticket assumido
  const totalGmvLast = markowitz.rows.reduce((s, r) => s + r.lastValue, 0);
  const defaultCapacity = Math.max(100, Math.round(totalGmvLast / 150)); // ticket assumido R$150
  const [capacityInput, setCapacityInput] = useState<string>("");
  const [ticketInput, setTicketInput] = useState<string>("150");
  const capacity = Number(capacityInput) > 0 ? Number(capacityInput) : defaultCapacity;
  const ticket = Number(ticketInput) > 0 ? Number(ticketInput) : 150;

  // Horizonte de cobertura desejado (dias) — janela padrão de reposição ao Full
  const [horizonteDias, setHorizonteDias] = useState<string>("30");
  const horizonte = Number(horizonteDias) > 0 ? Number(horizonteDias) : 30;

  const markowitzRows = useMemo(() => {
    return [...markowitz.rows]
      .map((r) => {
        const sharpe = r.volatility > 0 ? r.meanReturn / r.volatility : 0;
        const recommendedUnits = Math.round(r.weight * capacity);
        const recommendedGmv = r.weight * capacity * ticket;
        // Velocidade diária estimada (unidades) a partir do GMV recente
        const dailyUnits = ticket > 0 ? r.lastValue / ticket : 0;
        // Demanda esperada no horizonte
        const demandaHorizonte = dailyUnits * horizonte;
        // Cobertura (dias) gerada pelo envio recomendado
        const coberturaDias = dailyUnits > 0 ? recommendedUnits / dailyUnits : Infinity;
        // Shortfall: unidades faltando para cobrir o horizonte
        const shortfall = Math.max(0, Math.round(demandaHorizonte - recommendedUnits));
        // Risco de ruptura: cobertura abaixo de 60% do horizonte
        const ruptura = isFinite(coberturaDias) && coberturaDias < horizonte * 0.6 && dailyUnits > 0;
        return {
          ...r,
          sharpe,
          recommendedUnits,
          recommendedGmv,
          dailyUnits,
          demandaHorizonte,
          coberturaDias,
          shortfall,
          ruptura,
        };
      })
      .sort((a, b) => {
        // Risco de ruptura primeiro, depois maior peso
        if (a.ruptura !== b.ruptura) return a.ruptura ? -1 : 1;
        return b.weight - a.weight;
      });
  }, [markowitz.rows, capacity, ticket, horizonte]);

  const rupturaCount = markowitzRows.filter((r) => r.ruptura).length;

  // Tradução do peso em razão prática para a recomendação
  const explicarPeso = (r: typeof markowitzRows[number]) => {
    const pct = r.weight * 100;
    if (pct >= 15)
      return "Peso alto: GMV consistente e pouco correlacionado com a carteira — diversifica risco e merece prioridade no envio.";
    if (pct >= 5)
      return "Peso médio: contribui para a estabilidade da carteira sem concentrar risco em um único SKU.";
    if (pct > 0.5)
      return "Peso baixo: GMV mais volátil ou correlacionado com produtos já alocados — manter envio mínimo evita exposição extra.";
    return "Peso quase zero: GMV muito volátil ou redundante com outro SKU já alocado — Markowitz sugere não priorizar neste ciclo.";
  };

  // Exportação CSV
  const handleExport = () => {
    const headers = [
      "MLB",
      "Retorno_medio_%",
      "Volatilidade_%",
      "Sharpe",
      "Peso_otimo_%",
      "Unidades_recomendadas",
      "GMV_alocado",
      "Velocidade_diaria_unid",
      "Demanda_horizonte_unid",
      "Cobertura_dias",
      "Shortfall_unid",
      "Risco_ruptura",
      "Justificativa",
    ];
    const lines = markowitzRows.map((r) =>
      [
        r.label,
        (r.meanReturn * 100).toFixed(2),
        (r.volatility * 100).toFixed(2),
        r.sharpe.toFixed(2),
        (r.weight * 100).toFixed(2),
        r.recommendedUnits,
        r.recommendedGmv.toFixed(2),
        r.dailyUnits.toFixed(2),
        r.demandaHorizonte.toFixed(0),
        isFinite(r.coberturaDias) ? r.coberturaDias.toFixed(1) : "",
        r.shortfall,
        r.ruptura ? "SIM" : "NAO",
        `"${explicarPeso(r).replace(/"/g, "'")}"`,
      ].join(";"),
    );
    const csv = [headers.join(";"), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `markowitz-envio-full-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Heatmap helpers
  const heatColor = (c: number) => {
    // Diverging: vermelho (correlação alta) → cinza (0) → verde (negativa)
    if (c > 0) {
      const a = Math.min(1, Math.abs(c));
      return `hsla(0, 75%, 55%, ${0.15 + a * 0.7})`;
    }
    const a = Math.min(1, Math.abs(c));
    return `hsla(160, 75%, 40%, ${0.15 + a * 0.7})`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {logIcons.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-4 text-center ${item.isEmpty ? "opacity-40" : ""}`}
          >
            <item.icon className={`w-6 h-6 mx-auto mb-2 ${item.color === "neon-text" ? "text-neon-blue" : item.color === "emerald-text" ? "text-emerald" : "text-purple-400"}`} />
            <p className={`metric-value ${item.color}`}>{item.value}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <p className="metric-label">{item.label}</p>
              {item.label === "Full" ? (
                <AlgoTooltip tooltipKey="shareFullPct" />
              ) : item.label === "Flex" ? (
                <AlgoTooltip tooltipKey="shareFlexPct" />
              ) : (
                <TooltipInfo text={item.tooltip} />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
            {!item.isEmpty && (
              <Badge
                variant="outline"
                className={`mt-2 text-[10px] border bg-transparent ${statusColor(item.status)}`}
              >
                {statusLabel(item.status)}
              </Badge>
            )}
          </motion.div>
        ))}
      </div>

      {/* Junior strategic reading — financial impact of logistics mix */}
      {totalTgmv > 0 && (
        <div
          className={`glass-card p-4 border-l-4 ${
            showMigrationInsight ? "border-warning" : "border-emerald"
          }`}
        >
          <div className="flex items-start gap-3">
            {showMigrationInsight ? (
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">
                Leitura Estratégica do Mix Logístico
              </p>
              {showMigrationInsight ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    O share de Full ({shareFullGmv.toFixed(1)}%) está abaixo do ideal (≥ 60%) e há{" "}
                    <span className="font-mono font-bold text-foreground">
                      {fmtBRLCompact(totalTgmvAgencia)}
                    </span>{" "}
                    rodando em Agência/Coletas — modalidade despriorizada pelo algoritmo MELI.
                  </p>
                  <div className="flex items-center gap-2 mt-2 bg-muted/30 rounded p-2">
                    <TrendingUp className="w-4 h-4 text-emerald shrink-0" />
                    <p className="text-xs">
                      <span className="text-muted-foreground">Migrar 10pp para Full pode gerar </span>
                      <span className="font-mono font-bold text-emerald">
                        +{fmtBRLCompact(migrationPotentialGmv)}
                      </span>
                      <span className="text-muted-foreground"> de GMV adicional (premissa: +30% conversão em Full).</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-2">
                    Ação consultor: priorize SKUs A/B com alto giro para enviar ao Full primeiro.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Mix logístico saudável: Full ({shareFullGmv.toFixed(1)}%) acima do limiar do algoritmo.
                  Mantenha a estratégia e monitore SKUs novos para garantir entrada direta no Full.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Donut Chart — Summary */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Mix Logístico (Share GMV)
          </h3>
          <TooltipInfo text="Distribuição por GMV dos canais de fulfillment (Fonte: CPP_MENSAL). Maior proporção de Full melhora o desempenho no marketplace." />
        </div>
        <p className="text-[11px] text-muted-foreground text-center mb-3 leading-relaxed">
          ℹ️ <span className="font-medium text-foreground">Full</span> = <code className="text-[10px]">TGMV_LC_FULL</code> (FBM) ·{" "}
          <span className="font-medium text-foreground">Flex</span> = <code className="text-[10px]">TGMV_LC_FLEX</code> ·{" "}
          <span className="font-medium text-foreground">Agência/Coletas</span> = restante (inclui Coleta, Places e Correios — não separáveis no CSV diário).
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {donutData.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index]}
                  style={{ filter: `drop-shadow(0 0 8px ${COLORS[index]})` }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ color: "hsl(215, 20%, 70%)", fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Evolution Chart — Time Series */}
      {evolutionData.length > 1 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Evolução do Mix Logístico
            </h3>
            <TooltipInfo text="Evolução temporal do share de GMV por canal logístico. Acompanhe a migração para Full ao longo do tempo." />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="gradFullLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFlexLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAgLog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                interval="preserveStartEnd"
                angle={evolutionData.length > 8 ? -45 : 0}
                textAnchor={evolutionData.length > 8 ? "end" : "middle"}
                height={evolutionData.length > 8 ? 50 : 30}
              />
              <YAxis
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<EvolutionTooltip />} />
              <Area type="monotone" dataKey="% Full" stroke="hsl(199, 100%, 50%)" fill="url(#gradFullLog)" strokeWidth={2} />
              <Area type="monotone" dataKey="% Flex" stroke="hsl(160, 84%, 39%)" fill="url(#gradFlexLog)" strokeWidth={2} />
              <Area type="monotone" dataKey="% Agência" stroke="hsl(280, 80%, 60%)" fill="url(#gradAgLog)" strokeWidth={2} />
              <Legend wrapperStyle={{ color: "hsl(215, 20%, 55%)", fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Markowitz — Recomendação de envio por produto */}
      {markowitzRows.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Recomendação de Envio ao Full — Matriz de Markowitz
            </h3>
            <TooltipInfo text="Aloca a capacidade de envio entre produtos minimizando a variância da carteira (Markowitz min-variance, long-only). Penaliza produtos voláteis e diversifica entre GMVs descorrelacionados." />
          </div>
          <p className="text-[11px] text-muted-foreground text-center mb-4 leading-relaxed">
            Σ⁻¹·1 / (1ᵀΣ⁻¹1) sobre a matriz de covariância dos retornos diários de GMV por produto ·{" "}
            <span className="font-medium text-foreground">long-only</span> (clip de pesos negativos) ·{" "}
            top {markowitzRows.length} produtos por GMV acumulado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                Capacidade total de envio (unidades)
              </span>
              <Input
                type="number"
                inputMode="numeric"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                placeholder={String(defaultCapacity)}
                className="h-8 text-xs font-mono"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">
                Ticket médio assumido (R$)
              </span>
              <Input
                type="number"
                inputMode="numeric"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="150"
                className="h-8 text-xs font-mono"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/40">
                  <th className="py-2 pr-3 font-medium">Produto (MLB)</th>
                  <th className="py-2 px-2 font-medium text-right">Retorno μ</th>
                  <th className="py-2 px-2 font-medium text-right">Volatilidade σ</th>
                  <th className="py-2 px-2 font-medium text-right">Sharpe</th>
                  <th className="py-2 px-2 font-medium text-right">Peso ótimo</th>
                  <th className="py-2 px-2 font-medium text-right">Unidades recomendadas</th>
                  <th className="py-2 pl-2 font-medium text-right">GMV alocado</th>
                </tr>
              </thead>
              <tbody>
                {markowitzRows.map((r) => {
                  const pct = r.weight * 100;
                  const tone =
                    pct >= 15 ? "text-emerald" : pct >= 5 ? "text-neon-blue" : "text-muted-foreground";
                  return (
                    <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2 pr-3 font-mono text-foreground">{r.label}</td>
                      <td className="py-2 px-2 text-right font-mono tnum">
                        {(r.meanReturn * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono tnum">
                        {(r.volatility * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono tnum text-muted-foreground">
                        {r.sharpe.toFixed(2)}
                      </td>
                      <td className={`py-2 px-2 text-right font-mono tnum font-semibold ${tone}`}>
                        {pct.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-right font-mono tnum font-bold text-foreground">
                        {r.recommendedUnits.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 pl-2 text-right font-mono tnum text-muted-foreground">
                        {fmtBRLCompact(r.recommendedGmv)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/40 font-semibold">
                  <td className="py-2 pr-3 text-muted-foreground">Total</td>
                  <td colSpan={3}></td>
                  <td className="py-2 px-2 text-right font-mono tnum">
                    {(markowitzRows.reduce((s, r) => s + r.weight, 0) * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono tnum">
                    {markowitzRows.reduce((s, r) => s + r.recommendedUnits, 0).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pl-2 text-right font-mono tnum">
                    {fmtBRLCompact(markowitzRows.reduce((s, r) => s + r.recommendedGmv, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[10px] text-muted-foreground italic mt-3 leading-relaxed">
            Leitura: produtos com maior peso oferecem o melhor trade-off risco/retorno na carteira atual.
            Pesos baixos ou zero indicam GMV muito volátil ou altamente correlacionado a outro produto já alocado —
            priorize os pesos altos no próximo envio ao Full.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default LogisticsPanel;
