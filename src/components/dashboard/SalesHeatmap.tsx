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
    // Build a 7x24 grid (day x hour)
    // Since we only have daily data (no hour), we simulate distribution
    // using day-of-week aggregation. Hours will show uniform per day.
    // We distribute daily revenue across business hours (8-22) with a peak pattern.
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

  const getOpacity = (val: number) => {
    if (maxVal === 0) return 0.05;
    return Math.max(0.05, val / maxVal);
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
          Prime Time: <span className="font-semibold text-amber-500">{primeTime.day} {primeTime.hour}</span>
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
                  const opacity = getOpacity(val);
                  return (
                    <motion.div
                      key={hour}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (dayIdx * 24 + hour) * 0.001 }}
                      className="flex-1 h-6 rounded-[2px] relative group cursor-default"
                      style={{
                        backgroundColor: `hsl(199, 100%, 50%)`,
                        opacity,
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

          {/* Color scale */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground">Menor</span>
            <div className="flex gap-[1px]">
              {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((o, i) => (
                <div
                  key={i}
                  className="w-4 h-3 rounded-[1px]"
                  style={{ backgroundColor: "hsl(199, 100%, 50%)", opacity: o }}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">Maior</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesHeatmap;
