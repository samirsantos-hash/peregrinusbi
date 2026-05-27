import { useMemo } from "react";
import { Lightbulb, BarChart3 } from "lucide-react";
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

/* ── 5-state interpretation per correlation ── */
type Correlacao = {
  id: string;
  varX: string;
  varY: string;
  coef: number;
  sentidoEsperado: "positivo" | "negativo";
};

function interpretarCorrelacao(c: Correlacao) {
  const abs = Math.abs(c.coef);
  const correto = (c.coef > 0) === (c.sentidoEsperado === "positivo");
  const forca =
    abs >= 0.7 ? "forte" : abs >= 0.4 ? "moderada" : abs >= 0.2 ? "fraca" : "ausente";

  if (correto && forca === "forte") {
    return {
      tone: "emerald" as const,
      icone: "✅",
      titulo: `Sinergia forte (r = ${c.coef.toFixed(2)})`,
      texto: `${c.varX} e ${c.varY} se movem juntos com alta consistência. Cada melhoria em ${c.varX} tende a se refletir diretamente em ${c.varY}.`,
      acao: `Manter e ampliar. Investimento em ${c.varX} tem alto retorno esperado em ${c.varY}.`,
    };
  }
  if (correto && forca === "moderada") {
    return {
      tone: "emerald" as const,
      icone: "🟢",
      titulo: `Correlação moderada (r = ${c.coef.toFixed(2)})`,
      texto: `${c.varX} influencia ${c.varY}, mas outros fatores também interferem. A relação é real mas não exclusiva.`,
      acao: `Continuar otimizando ${c.varX} junto com outros drivers. Não depender só dessa alavanca.`,
    };
  }
  if (correto && forca === "fraca") {
    return {
      tone: "warning" as const,
      icone: "🟡",
      titulo: `Correlação fraca (r = ${c.coef.toFixed(2)})`,
      texto: `${c.varX} tem pouca influência observada em ${c.varY} neste período. Pode ser sazonalidade, volume insuficiente de dados ou outros fatores dominando.`,
      acao: `Investigar com mais dados antes de tirar conclusões. Não é evidência de problema — é inconclusivo.`,
    };
  }
  if (forca === "ausente") {
    return {
      tone: "muted" as const,
      icone: "⚪",
      titulo: `Sem correlação (r = ${c.coef.toFixed(2)})`,
      texto: `${c.varX} e ${c.varY} não apresentam relação linear neste período.`,
      acao: `Verificar se há dados suficientes. Se sim, outros fatores estão determinando ${c.varY}.`,
    };
  }
  return {
    tone: "destructive" as const,
    icone: "🔴",
    titulo: `Correlação invertida — atenção (r = ${c.coef.toFixed(2)})`,
    texto: `${c.varX} está se movendo na direção OPOSTA ao esperado em relação a ${c.varY}. Pode indicar problema operacional ou período atípico.`,
    acao: `Investigar imediatamente. Possíveis causas: mudança de mix, sazonalidade invertida ou problema operacional específico.`,
  };
}

const TONE_STYLES = {
  emerald: "border-emerald/40 bg-emerald/5",
  warning: "border-warning/40 bg-warning/5",
  muted: "border-border/40 bg-muted/10",
  destructive: "border-destructive/40 bg-destructive/5",
} as const;

const TONE_TEXT = {
  emerald: "text-emerald",
  warning: "text-warning",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
} as const;

const METRICS = [
  { key: "gmv", label: "Faturamento", short: "GMV" },
  { key: "adsInvestment", label: "Investimento Ads", short: "Ads" },
  { key: "visits", label: "Visitas", short: "Visitas" },
  { key: "repCancellationsRate", label: "Cancelamento", short: "Cancel." },
];

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

  const interpretacoes = useMemo(() => {
    const correlacoes: Correlacao[] = [
      { id: "ads_gmv", varX: "Investimento em Ads", varY: "GMV", coef: corrAdsGmv, sentidoEsperado: "positivo" },
      { id: "visitas_gmv", varX: "Visitas", varY: "GMV", coef: corrVisitsGmv, sentidoEsperado: "positivo" },
      { id: "cancel_gmv", varX: "Cancelamentos", varY: "GMV", coef: corrCancelGmv, sentidoEsperado: "negativo" },
    ];
    return correlacoes.map((c) => ({ correlacao: c, ...interpretarCorrelacao(c) }));
  }, [corrAdsGmv, corrVisitsGmv, corrCancelGmv]);

  if (kpis.length === 0) return null;

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
            {interpretacoes.map(({ correlacao, tone, icone, titulo, texto, acao }) => (
              <div
                key={correlacao.id}
                className={`rounded-lg border p-4 transition-all ${TONE_STYLES[tone]}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{icone}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-xs font-semibold ${TONE_TEXT[tone]}`}>
                        {titulo}
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {correlacao.varX} → {correlacao.varY}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground/85 mb-1.5">
                      {texto}
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground/90">💡 Ação: </span>
                      {acao}
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
