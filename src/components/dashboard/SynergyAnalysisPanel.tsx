import { useMemo } from "react";
import { Lightbulb, AlertTriangle, TrendingUp, Award, Target, BarChart3 } from "lucide-react";
import TooltipInfo from "./TooltipInfo";

interface SynergyAnalysisPanelProps {
  kpis: any[];
}

/* ── Pearson correlation ── */
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

/* ── Color scale for correlation value ── */
function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "hsl(199, 100%, 50%)" : "hsl(0, 84%, 60%)";
  if (abs > 0.4) return r > 0 ? "hsl(199, 70%, 65%)" : "hsl(0, 60%, 70%)";
  return "hsl(215, 20%, 55%)";
}

function corrBg(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "hsl(199 100% 50% / 0.12)" : "hsl(0 84% 60% / 0.12)";
  if (abs > 0.4) return r > 0 ? "hsl(199 100% 50% / 0.06)" : "hsl(0 84% 60% / 0.06)";
  return "hsl(215 20% 55% / 0.03)";
}

function corrLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return r > 0 ? "Forte +" : "Forte −";
  if (abs > 0.4) return r > 0 ? "Moderada +" : "Moderada −";
  return "Fraca";
}

const METRICS = [
  { key: "gmv", label: "Faturamento", short: "GMV" },
  { key: "adsInvestment", label: "Investimento Ads", short: "Ads" },
  { key: "visits", label: "Visitas", short: "Visitas" },
  { key: "repCancellationsRate", label: "Cancelamento", short: "Cancel." },
];

interface Insight {
  icon: typeof Lightbulb;
  title: string;
  text: string;
  severity: "positive" | "warning" | "neutral";
}

function generateInsights(
  corrAdsGmv: number,
  corrVisitsGmv: number,
  corrCancelGmv: number,
  kpis: any[]
): Insight[] {
  const insights: Insight[] = [];

  // Ads vs GMV
  if (corrAdsGmv > 0.8) {
    insights.push({
      icon: TrendingUp,
      title: "Sinergia Ads → Faturamento",
      text: "Identificamos uma sinergia fortíssima entre seus anúncios e vendas. Cada real investido está impulsionando o faturamento de forma direta. Recomendação: Escalar orçamento de Ads.",
      severity: "positive",
    });
  } else if (corrAdsGmv > 0.4) {
    insights.push({
      icon: Target,
      title: "Ads com Impacto Moderado",
      text: "O investimento em Ads tem impacto moderado no faturamento. Recomenda-se otimizar a segmentação e os criativos antes de escalar o orçamento.",
      severity: "neutral",
    });
  } else {
    insights.push({
      icon: AlertTriangle,
      title: "Baixa Eficiência de Ads",
      text: "O investimento em Ads não está se convertendo em faturamento proporcional. Revise a estratégia de palavras-chave, público-alvo e relevância dos anúncios.",
      severity: "warning",
    });
  }

  // Visits vs GMV
  if (corrVisitsGmv < 0.3) {
    insights.push({
      icon: AlertTriangle,
      title: "Gargalo de Conversão",
      text: "Atenção: Suas visitas estão subindo, mas as vendas não acompanham. Isso indica um gargalo na página do produto (fotos, descrição ou confiança). Recomenda-se auditoria de conteúdo.",
      severity: "warning",
    });
  } else if (corrVisitsGmv > 0.7) {
    insights.push({
      icon: TrendingUp,
      title: "Tráfego Qualificado",
      text: "Excelente conversão de visitas em vendas. O tráfego que chega aos seus anúncios é altamente qualificado. Continue investindo em visibilidade.",
      severity: "positive",
    });
  }

  // Cancellations vs GMV
  if (corrCancelGmv < -0.4) {
    insights.push({
      icon: Lightbulb,
      title: "Cancelamentos Impactam Vendas",
      text: "A correlação negativa entre cancelamentos e faturamento indica que reduzir cancelamentos pode liberar potencial de receita represada. Foque em qualidade de atendimento.",
      severity: "warning",
    });
  } else if (Math.abs(corrCancelGmv) < 0.2) {
    insights.push({
      icon: Award,
      title: "Operação Estável",
      text: "Os cancelamentos não estão impactando significativamente o faturamento. Sua operação logística está saudável neste aspecto.",
      severity: "positive",
    });
  }

  // Market leadership check
  if (kpis.length > 0) {
    const latestKpi = [...kpis].sort((a, b) => b.date.localeCompare(a.date))[0];
    const gmvM1 = latestKpi?.gmvM1 || 0;
    const gmv = latestKpi?.gmv || 0;
    if (gmvM1 > 0 && gmv / gmvM1 > 1.5) {
      insights.push({
        icon: Award,
        title: "Liderança de Categoria",
        text: "Sua conta atingiu a Liderança de Categoria. O crescimento agora virá da otimização de margem e não apenas de volume. Considere testar preços premium.",
        severity: "positive",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      icon: Lightbulb,
      title: "Dados Insuficientes",
      text: "Precisamos de mais registros no período selecionado para gerar insights confiáveis. Tente expandir o filtro de datas.",
      severity: "neutral",
    });
  }

  return insights;
}

const SynergyAnalysisPanel = ({ kpis }: SynergyAnalysisPanelProps) => {
  const { matrix, corrAdsGmv, corrVisitsGmv, corrCancelGmv } = useMemo(() => {
    const extract = (key: string) =>
      kpis.map((k) => Number(k[key]) || 0).filter((v) => isFinite(v));

    const series = METRICS.map((m) => extract(m.key));
    const n = METRICS.length;

    // Build correlation matrix
    const mat: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? 1 : pearson(series[i], series[j]));
      }
      mat.push(row);
    }

    return {
      matrix: mat,
      corrAdsGmv: pearson(series[1], series[0]),
      corrVisitsGmv: pearson(series[2], series[0]),
      corrCancelGmv: pearson(series[3], series[0]),
    };
  }, [kpis]);

  const insights = useMemo(
    () => generateInsights(corrAdsGmv, corrVisitsGmv, corrCancelGmv, kpis),
    [corrAdsGmv, corrVisitsGmv, corrCancelGmv, kpis]
  );

  if (kpis.length === 0) return null;

  const severityStyles = {
    positive: "border-emerald/30 bg-emerald/5",
    warning: "border-warning/30 bg-warning/5",
    neutral: "border-border/30 bg-muted/10",
  };

  const severityIconColor = {
    positive: "text-emerald",
    warning: "text-warning",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-neon-blue" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Análise de Sinergia Operacional
        </h3>
        <TooltipInfo text="Matriz de correlação entre métricas-chave do seller. Azul = correlação positiva, Vermelho = inversa. O painel de insights é gerado automaticamente a partir dos dados do período selecionado." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Correlation Heatmap */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
            Matriz de Correlação (Pearson)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-20" />
                  {METRICS.map((m) => (
                    <th
                      key={m.key}
                      className="text-[10px] font-medium text-muted-foreground text-center p-2 min-w-[70px]"
                    >
                      {m.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((rowMetric, ri) => (
                  <tr key={rowMetric.key}>
                    <td className="text-[10px] font-medium text-muted-foreground text-right pr-3 py-1">
                      {rowMetric.short}
                    </td>
                    {METRICS.map((_, ci) => {
                      const val = matrix[ri][ci];
                      const isDiag = ri === ci;
                      return (
                        <td key={ci} className="p-1">
                          <div
                            className="rounded-md flex flex-col items-center justify-center transition-all hover:scale-105"
                            style={{
                              background: isDiag ? "hsl(var(--muted) / 0.3)" : corrBg(val),
                              height: 56,
                              minWidth: 56,
                            }}
                          >
                            <span
                              className="text-sm font-bold font-mono"
                              style={{ color: isDiag ? "hsl(var(--muted-foreground))" : corrColor(val) }}
                            >
                              {isDiag ? "—" : val.toFixed(2)}
                            </span>
                            {!isDiag && (
                              <span className="text-[8px] text-muted-foreground mt-0.5">
                                {corrLabel(val)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(199, 100%, 50%)", opacity: 0.7 }} />
              Positiva forte
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(215, 20%, 55%)", opacity: 0.5 }} />
              Neutra
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(0, 84%, 60%)", opacity: 0.7 }} />
              Negativa forte
            </span>
          </div>
        </div>

        {/* RIGHT: Strategic Insights */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Leitura Estratégica do Consultor
          </p>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 transition-all ${severityStyles[insight.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${severityIconColor[insight.severity]}`}>
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-foreground mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {insight.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Ads → GMV", value: corrAdsGmv },
              { label: "Visitas → GMV", value: corrVisitsGmv },
              { label: "Cancel. → GMV", value: corrCancelGmv },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-2 rounded-md bg-muted/20 border border-border/20">
                <span
                  className="text-base font-bold font-mono block"
                  style={{ color: corrColor(stat.value) }}
                >
                  {stat.value.toFixed(2)}
                </span>
                <span className="text-[9px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynergyAnalysisPanel;
