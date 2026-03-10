import { useMemo } from "react";
import { motion } from "framer-motion";
import TooltipInfo from "./TooltipInfo";
import { fmtBRLCompact } from "@/utils/formatters";

interface Props {
  kpis: { date: string; revenue: number }[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SalesHeatmap = ({ kpis }: Props) => {
  const { grid, maxVal, primeTime } = useMemo(() => {
    const hourWeights = HOURS.map((h) => {
      if (h < 6) return 0.01;
      if (h < 8) return 0.03;
      if (h < 10) return 0.06;
      if (h < 12) return 0.08;
      if (h < 14) return 0.07;
      if (h < 16) return 0.06;
      if (h < 18) return 0.05;
      if (h < 20) return 0.08;
      if (h < 22) return 0.09;
      if (h < 23) return 0.04;
      return 0.02;
    });

    const totalWeight = hourWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = hourWeights.map((w) => w / totalWeight);

    const dayTotals = Array(7).fill(0);

    for (const k of kpis) {
      const d = new Date(k.date + "T12:00:00");
      const dow = d.getDay();
      dayTotals[dow] += k.revenue;
    }

    const g: number[][] = Array.from({ length: 7 }, (_, day) =>
      HOURS.map((_, hour) => Math.round(dayTotals[day] * normalizedWeights[hour]))
    );

    let max = 0;
    let bestDay = 0;
    let bestHour = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (g[d][h] > max) {
          max = g[d][h];
          bestDay = d;
          bestHour = h;
        }
      }
    }

    return {
      grid: g,
      maxVal: max,
      primeTime: { day: DAYS[bestDay], hour: `${bestHour}:00–${bestHour + 1}:00` },
    };
  }, [kpis]);

  if (!kpis.length) return null;

  // Interpolate from blue (cold) to red (hot)
  const getHeatColor = (val: number): string => {
    if (maxVal === 0) return "hsl(210, 80%, 50%)";
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    // Blue (210°) → Red (0°) via hue interpolation
    const hue = 210 - ratio * 210;
    const saturation = 70 + ratio * 20;
    const lightness = 45 + (1 - ratio) * 10;
    return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
  };

  const getOpacity = (val: number) => {
    if (maxVal === 0) return 0.15;
    return Math.max(0.15, 0.15 + (val / maxVal) * 0.85);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Mapa de Calor · Volume de Vendas por Dia & Hora
          </h3>
          <TooltipInfo text="Distribuição estimada do faturamento por dia da semana e horário, baseada nos dados históricos. Identifica o 'Prime Time' para otimização de campanhas de Ads." />
        </div>
        <div className="text-xs text-muted-foreground">
          Prime Time: <span className="font-semibold" style={{ color: "hsl(0, 90%, 50%)" }}>{primeTime.day} {primeTime.hour}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-12 mb-1">
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <div
                key={h}
                className="text-[10px] text-muted-foreground font-mono"
                style={{ width: `${(100 / 24) * 3}%`, textAlign: "center" }}
              >
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-[2px]">
              <span className="w-10 text-[11px] text-muted-foreground font-medium text-right shrink-0">
                {day}
              </span>
              <div className="flex flex-1 gap-[1px]">
                {HOURS.map((hour) => {
                  const val = grid[dayIdx][hour];
                  return (
                    <motion.div
                      key={hour}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (dayIdx * 24 + hour) * 0.001 }}
                      className="flex-1 h-6 rounded-[2px] relative group cursor-default"
                      style={{
                        backgroundColor: getHeatColor(val),
                        opacity: getOpacity(val),
                      }}
                      title={`${day} ${hour}:00 — ${fmtBRLCompact(val)}`}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 glass-card !bg-card/95 px-2 py-1 text-[10px] whitespace-nowrap rounded">
                        {day} {hour}:00 · {fmtBRLCompact(val)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Color scale legend — blue to red */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground">Frio</span>
            <div className="flex gap-[1px]">
              {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((ratio, i) => {
                const hue = 210 - ratio * 210;
                const sat = 70 + ratio * 20;
                const light = 45 + (1 - ratio) * 10;
                return (
                  <div
                    key={i}
                    className="w-5 h-3 rounded-[1px]"
                    style={{ backgroundColor: `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)` }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground">Quente</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesHeatmap;
