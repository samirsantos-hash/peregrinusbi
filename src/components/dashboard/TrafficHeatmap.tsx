import NumeroAnimado from "@/components/ds/NumeroAnimado";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, Star } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { fmtBRLCompact, fmtNumCompact, fmtNum } from "@/utils/formatters";

interface KpiLike {
  date: string;
  visits: number;
  tsi: number;
  revenue: number;
}

interface Props {
  kpis: KpiLike[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface CellData {
  visits: number;
  orders: number;
  gmv: number;
  conversion: number;
}

const TrafficHeatmap = ({ kpis }: Props) => {
  const { grid, maxVal, top3, insights, resumo } = useMemo(() => {
    // Hour distribution weights (traffic patterns)
    const hourWeights = HOURS.map((h) => {
      if (h < 6) return 0.01;
      if (h < 8) return 0.03;
      if (h < 10) return 0.07;
      if (h < 12) return 0.09;
      if (h < 14) return 0.08;
      if (h < 16) return 0.07;
      if (h < 18) return 0.06;
      if (h < 20) return 0.09;
      if (h < 22) return 0.10;
      if (h < 23) return 0.05;
      return 0.02;
    });
    const totalWeight = hourWeights.reduce((a, b) => a + b, 0);
    const nw = hourWeights.map((w) => w / totalWeight);

    // Aggregate by day of week
    const dayTotals = Array.from({ length: 7 }, () => ({ visits: 0, orders: 0, gmv: 0 }));

    for (const k of kpis) {
      const d = new Date(k.date + "T12:00:00");
      const dow = d.getDay();
      dayTotals[dow].visits += k.visits;
      dayTotals[dow].orders += k.tsi;
      dayTotals[dow].gmv += k.revenue;
    }

    // Build grid
    const g: CellData[][] = Array.from({ length: 7 }, (_, day) =>
      HOURS.map((_, hour) => {
        const visits = Math.round(dayTotals[day].visits * nw[hour]);
        const orders = Math.round(dayTotals[day].orders * nw[hour]);
        const gmv = Math.round(dayTotals[day].gmv * nw[hour]);
        const conversion = visits > 0 ? (orders / visits) * 100 : 0;
        return { visits, orders, gmv, conversion };
      })
    );

    // Find max visits
    let max = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (g[d][h].visits > max) max = g[d][h].visits;
      }
    }

    // Find top 3 cells
    const allCells: { day: number; hour: number; visits: number; conversion: number; gmv: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        allCells.push({ day: d, hour: h, visits: g[d][h].visits, conversion: g[d][h].conversion, gmv: g[d][h].gmv });
      }
    }
    allCells.sort((a, b) => b.visits - a.visits);
    const topCells = allCells.slice(0, 3);

    // Generate insights
    const insightList: { type: "positive" | "critical"; text: string }[] = [];

    if (topCells.length > 0) {
      const best = topCells[0];
      insightList.push({
        type: "positive",
        text: `Sua maior concentração de tráfego ocorre às ${best.hour}:00 (${DAYS_FULL[best.day]}). Considere concentrar o orçamento de Ads neste período para maximizar o ROI.`,
      });
    }

    // Find high traffic + low conversion
    const highTrafficLowConv = allCells
      .filter((c) => c.visits > max * 0.5 && c.conversion < 2)
      .sort((a, b) => b.visits - a.visits);

    if (highTrafficLowConv.length > 0) {
      const cell = highTrafficLowConv[0];
      insightList.push({
        type: "critical",
        text: `Detectamos alta visitação ${DAYS_FULL[cell.day]} às ${cell.hour}:00 com baixa conversão (${fmtNum(cell.conversion, 1)}%). Sugestão: Validar se o tempo de resposta às perguntas está lento neste horário.`,
      });
    }

    // Weekend vs weekday traffic comparison
    const weekendVisits = dayTotals[0].visits + dayTotals[6].visits;
    const weekdayVisits = dayTotals.slice(1, 6).reduce((s, d) => s + d.visits, 0);
    if (weekendVisits > weekdayVisits * 0.6) {
      insightList.push({
        type: "positive",
        text: `O tráfego de fim de semana representa ${((weekendVisits / (weekendVisits + weekdayVisits)) * 100).toFixed(0).replace(".", ",")}% do total. Mantenha campanhas ativas no sábado e domingo.`,
      });
    }

    // Night traffic insight
    const nightVisits = Array.from({ length: 7 }, (_, d) =>
      g[d].slice(20, 24).reduce((s, c) => s + c.visits, 0)
    ).reduce((s, v) => s + v, 0);
    const totalVisits = dayTotals.reduce((s, d) => s + d.visits, 0);
    if (totalVisits > 0 && nightVisits / totalVisits > 0.25) {
      insightList.push({
        type: "critical",
        text: `${((nightVisits / totalVisits) * 100).toFixed(0).replace(".", ",")}% das visitas ocorrem após as 20h. Garanta que o estoque e o atendimento estejam preparados para o horário noturno.`,
      });
    }

    return {
      grid: g,
      maxVal: max,
      top3: new Set(topCells.map((c) => `${c.day}-${c.hour}`)),
      insights: insightList.slice(0, 3),
      resumo: (() => {
        const v = allCells.reduce((a, c) => a + c.visits, 0);
        const o = g.flat().reduce((a, c) => a + c.orders, 0);
        const pico = topCells[0];
        return { visitas: v, pedidos: o, conv: v > 0 ? (o / v) * 100 : 0, pico: pico ? pico.visits : 0 };
      })(),
    };
  }, [kpis]);

  if (!kpis.length) return null;

  // Escala única da identidade: ciano da marca, do vidro escuro ao ciano intenso
  const getHeatColor = (val: number): string => {
    const ratio = maxVal === 0 ? 0 : Math.max(0, Math.min(1, val / maxVal));
    return `rgb(34 211 238 / ${(0.04 + ratio * 0.86).toFixed(2)})`;
  };
  const getOpacity = (_val: number) => 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Heatmap — 2 cols */}
      <div className="lg:col-span-2 glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Mapa de Calor · Sensibilidade de Tráfego (Visitas vs. Hora)
            </h3>
            <TooltipInfo text="Distribuição estimada das visitas por dia da semana e horário. As ⭐ indicam os 3 horários nobres (maior tráfego). Passe o mouse para ver conversão e GMV." />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            ["Visitas", fmtNumCompact(resumo.visitas)],
            ["Vendas", fmtNumCompact(resumo.pedidos)],
            ["Conversão média", `${fmtNum(resumo.conv, 1)}%`],
            ["Visitas no pico", fmtNumCompact(resumo.pico)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
              <p className="text-[11px] text-muted-foreground">{k}</p>
              <p className="text-base font-medium text-foreground"><NumeroAnimado valor={v} /></p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
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
              <div key={day} className="flex items-center gap-1 mb-[3px]">
                <span className="w-10 text-[11px] text-muted-foreground font-medium text-right shrink-0">
                  {day}
                </span>
                <div className="flex flex-1 gap-[3px]">
                  {HOURS.map((hour) => {
                    const cell = grid[dayIdx][hour];
                    const isTop3 = top3.has(`${dayIdx}-${hour}`);
                    return (
                      <motion.div
                        key={hour}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (dayIdx * 24 + hour) * 0.001 }}
                        className={`flex-1 h-7 rounded-md border border-white/5 relative group cursor-default flex items-center justify-center transition-transform duration-150 hover:scale-110 hover:z-10 hover:border-white/40 ${
                          isTop3 ? "ring-1 ring-white/70 shadow-[0_0_12px_rgb(34_211_238/0.6)]" : ""
                        }`}
                        style={{
                          backgroundColor: getHeatColor(cell.visits),
                          opacity: getOpacity(cell.visits),
                        }}
                      >
                        {isTop3 && (
                          <Star className="w-3 h-3 text-white fill-white drop-shadow-sm" />
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 glass-card !bg-card/95 px-3 py-2 text-[10px] whitespace-nowrap rounded space-y-0.5">
                          <p className="font-semibold text-foreground">{day} {hour}:00–{hour + 1}:00</p>
                          <p>Visitas: <span className="font-mono text-foreground">{fmtNumCompact(cell.visits)}</span></p>
                          <p>Conversão: <span className="font-mono text-foreground">{fmtNum(cell.conversion, 1)}%</span></p>
                          <p>GMV: <span className="font-mono text-foreground">{fmtBRLCompact(cell.gmv)}</span></p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Color scale legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Baixo</span>
              <div className="flex gap-[1px]">
                {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((ratio, i) => (
                  <div
                    key={i}
                    className="w-5 h-3 rounded-sm border border-white/5"
                    style={{ backgroundColor: getHeatColor(ratio * (maxVal || 1)) }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">Alto</span>
              <span className="text-[10px] text-muted-foreground ml-2 flex items-center gap-1">
                <Star className="w-3 h-3 text-neon-blue fill-neon-blue" /> Horário Nobre
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights panel — 1 col */}
      <div className="glass-card p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Leitura do Consultor
          </h3>
          <TooltipInfo text="Insights automáticos gerados a partir da análise do mapa de calor de tráfego." />
        </div>

        {insights.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Dados insuficientes para gerar insights de tráfego.</p>
        )}

        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`flex gap-3 items-start p-3 rounded-lg border ${
              ins.type === "positive"
                ? "border-ec-verde/30 bg-ec-verde/5"
                : "border-ec-ambar/30 bg-ec-ambar/5"
            }`}
          >
            {ins.type === "positive" ? (
              <Lightbulb className="w-4 h-4 text-ok shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-ec-ambar shrink-0 mt-0.5" />
            )}
            <p className="text-xs leading-relaxed text-foreground/90">{ins.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrafficHeatmap;
