import { useMemo } from "react";
import { ShieldAlert, ShieldCheck, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConsolidatedSeller } from "@/utils/cppAggregation";

interface Props {
  data: ConsolidatedSeller[];
  /** When a single seller is selected, show detailed rate bars */
  selectedSeller?: ConsolidatedSeller | null;
}

// REP_CURRENT_LEVEL mapping
const LEVEL_CONFIG: Record<string, { label: string; color: string; group: "healthy" | "warning" | "critical" | "newbie" }> = {
  green:          { label: "Verde",          color: "#1D9E75", group: "healthy" },
  green_platinum: { label: "Verde Platinum", color: "#0F6E56", group: "healthy" },
  green_gold:     { label: "Verde Gold",     color: "#27500A", group: "healthy" },
  green_silver:   { label: "Verde Silver",   color: "#639922", group: "healthy" },
  light_green:    { label: "Verde Claro",    color: "#9FE1CB", group: "healthy" },
  yellow:         { label: "Amarelo",        color: "#BA7517", group: "warning" },
  orange:         { label: "Laranja",        color: "#D85A30", group: "critical" },
  red:            { label: "Vermelho",       color: "#E24B4A", group: "critical" },
  newbie:         { label: "Novato",         color: "#888780", group: "newbie" },
};

interface RateConfig {
  key: string;
  label: string;
  median: number;
  greenMax: number;
  yellowMax: number;
}

const RATE_CONFIGS: RateConfig[] = [
  { key: "REP_DELAYED_HT_RATE",          label: "Atraso na entrega",  median: 0.71, greenMax: 2, yellowMax: 5 },
  { key: "REP_CLAIMS_RATE",              label: "Reclamações",        median: 0.26, greenMax: 2, yellowMax: 5 },
  { key: "REP_DISPUTES_RATE",            label: "Disputas",           median: 0.00, greenMax: 2, yellowMax: 5 },
  { key: "REP_SELLER_CANCELLATIONS_RATE", label: "Cancelamentos",     median: 0.00, greenMax: 2, yellowMax: 5 },
];

// Also check the old key name
function getRate(seller: ConsolidatedSeller, key: string): number {
  let v = Number(seller[key]) || 0;
  // Fallback for cancellations (old key)
  if (key === "REP_SELLER_CANCELLATIONS_RATE" && !v) {
    v = Number(seller["REP_CANCELLATIONS_RATE"]) || 0;
  }
  // Values are 0-1, convert to percentage
  const pct = v * 100;
  // Cap outliers at 20% for display
  return pct;
}

function rateSeverity(pct: number, cfg: RateConfig): "green" | "amber" | "red" {
  if (pct <= cfg.greenMax) return "green";
  if (pct <= cfg.yellowMax) return "amber";
  return "red";
}

const SEV_STYLES = {
  green: { bg: "bg-emerald-500", text: "text-emerald-400", label: "OK" },
  amber: { bg: "bg-amber-500", text: "text-amber-400", label: "Alerta" },
  red:   { bg: "bg-destructive", text: "text-destructive", label: "Crítico" },
};

export default function CppReputationAlert({ data, selectedSeller }: Props) {
  const { levelDist, groupSummary, delayedAbove2, delayedImpactMsg } = useMemo(() => {
    const dist: Record<string, number> = {};
    let delayed2 = 0;

    for (const s of data) {
      const level = String(s["REP_CURRENT_LEVEL"] || "").trim().toLowerCase() || "sem_dados";
      dist[level] = (dist[level] || 0) + 1;

      const delayRate = (Number(s["REP_DELAYED_HT_RATE"]) || 0);
      if (delayRate > 0.02) delayed2++;
    }

    const healthyKeys = ["green", "green_platinum", "green_gold", "green_silver", "light_green"];
    const warningKeys = ["yellow"];
    const criticalKeys = ["orange", "red"];

    const healthy = healthyKeys.reduce((s, k) => s + (dist[k] || 0), 0);
    const warning = warningKeys.reduce((s, k) => s + (dist[k] || 0), 0);
    const critical = criticalKeys.reduce((s, k) => s + (dist[k] || 0), 0);
    const newbie = dist["newbie"] || 0;
    const noData = dist["sem_dados"] || 0;

    const total = data.length;
    const pctHealthy = total > 0 ? ((healthy / total) * 100).toFixed(0) : "0";

    return {
      levelDist: dist,
      groupSummary: { healthy, warning, critical, newbie, noData, pctHealthy },
      delayedAbove2: delayed2,
      delayedImpactMsg: `Sellers com atraso ≤2%: GMV mediano R$81.245 · Sellers >2%: GMV mediano R$11.896 (−85%)`,
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Global Alert Banner */}
        {delayedAbove2 > 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl border text-sm"
            style={{ background: "#FCEBEB", borderColor: "#E24B4A", color: "#A32D2D" }}
          >
            <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: "#E24B4A" }} />
            <div>
              <p className="font-semibold">
                {delayedAbove2} sellers com atraso de entrega acima do limite — impacto direto no posicionamento orgânico
              </p>
              <p className="text-xs mt-0.5 opacity-80">{delayedImpactMsg}</p>
            </div>
          </div>
        )}

        {/* Level Distribution Summary */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Distribuição de Reputação — {data.length} sellers
            </span>
          </div>

          {/* Group bars */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Saudável", count: groupSummary.healthy, color: "#1D9E75" },
              { label: "Atenção", count: groupSummary.warning, color: "#BA7517" },
              { label: "Crítico", count: groupSummary.critical, color: "#E24B4A" },
              { label: "Novato", count: groupSummary.newbie, color: "#888780" },
              { label: "Sem dados", count: groupSummary.noData, color: "hsl(var(--muted-foreground))" },
            ].map(g => {
              const pct = data.length > 0 ? ((g.count / data.length) * 100) : 0;
              return (
                <div key={g.label} className="text-center">
                  <span className="text-lg font-bold font-mono" style={{ color: g.color }}>
                    {g.count}
                  </span>
                  <p className="text-[10px] text-muted-foreground">{g.label} ({pct.toFixed(0)}%)</p>
                </div>
              );
            })}
          </div>

          {/* Detailed level breakdown */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => {
              const count = levelDist[key] || 0;
              if (count === 0) return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
                  style={{ borderColor: cfg.color + "40", color: cfg.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  {cfg.label}: {count}
                </span>
              );
            })}
            {(levelDist["sem_dados"] || 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Sem dados: {levelDist["sem_dados"]}
              </span>
            )}
          </div>
        </div>

        {/* Seller-specific rate bars */}
        {selectedSeller && (
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Taxas de Reputação — {String(selectedSeller.CUS_NICKNAME)}
              </span>
              {selectedSeller["REP_CURRENT_LEVEL"] && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: LEVEL_CONFIG[String(selectedSeller["REP_CURRENT_LEVEL"]).toLowerCase()]?.color || "hsl(var(--muted-foreground))",
                    borderWidth: 1,
                    borderColor: (LEVEL_CONFIG[String(selectedSeller["REP_CURRENT_LEVEL"]).toLowerCase()]?.color || "#888") + "40",
                  }}
                >
                  {LEVEL_CONFIG[String(selectedSeller["REP_CURRENT_LEVEL"]).toLowerCase()]?.label || String(selectedSeller["REP_CURRENT_LEVEL"])}
                </span>
              )}
            </div>

            {RATE_CONFIGS.map(cfg => {
              const rawPct = getRate(selectedSeller, cfg.key);
              const displayPct = Math.min(rawPct, 20); // cap visual at 20%
              const sev = rateSeverity(rawPct, cfg);
              const styles = SEV_STYLES[sev];
              const ratio = rawPct > 0 && cfg.median > 0 ? (rawPct / cfg.median).toFixed(0) : null;

              return (
                <Tooltip key={cfg.key}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground font-medium">{cfg.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {rawPct.toFixed(2).replace(".", ",")}%
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${styles.text}`}
                            style={{ background: sev === "green" ? "rgba(29,158,117,0.15)" : sev === "amber" ? "rgba(186,117,23,0.15)" : "rgba(226,75,74,0.15)" }}
                          >
                            {styles.label}
                            {rawPct > 20 ? " ▲" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${styles.bg}`}
                          style={{ width: `${Math.min((displayPct / 20) * 100, 100)}%`, opacity: rawPct === 0 ? 0.2 : 1 }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Mediana da carteira: {cfg.median.toFixed(2).replace(".", ",")}%
                      {ratio && Number(ratio) > 1 ? ` — este seller está ${ratio}x acima` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      🟢 ≤{cfg.greenMax}% · 🟡 ≤{cfg.yellowMax}% · 🔴 &gt;{cfg.yellowMax}%
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
