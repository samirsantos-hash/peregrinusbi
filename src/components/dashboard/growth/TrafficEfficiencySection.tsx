import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Coins, Percent } from "lucide-react";
import type { SellerKPI } from "@/hooks/useSellerData";
import {
  AXIS_TICK_FONT_SIZE,
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
} from "@/lib/chartTheme";

const SERIES_ADS = "hsl(var(--series-2))";
const SERIES_VISITS = "hsl(var(--series-3))";
import GrowthMetricCard from "./GrowthMetricCard";
import { fmtCpvGrowth, fmtIntGrowth, fmtMoneyGrowth } from "./growthFormat";
import { formatChartDate } from "@/utils/formatters";

type Props = {
  kpis: SellerKPI[];
  dataGranularity: "consolidated" | "daily";
  periodLabel: string;
};

/**
 * Seção 2 — Meso: correlação Ads × Visitas + síntese CPV/CVR.
 */
export function TrafficEfficiencySection({ kpis, dataGranularity, periodLabel }: Props) {
  const { series, visits, ads, cpv, cvr, orders } = useMemo(() => {
    const byKey = new Map<string, { ads: number; visits: number }>();
    for (const k of kpis) {
      const key =
        dataGranularity === "daily" ? k.date.slice(0, 10) : k.date.slice(0, 7);
      const cur = byKey.get(key) || { ads: 0, visits: 0 };
      cur.ads += k.adsInvestment || 0;
      cur.visits += k.visits || 0;
      byKey.set(key, cur);
    }
    const series = [...byKey.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        label: formatChartDate(
          key.length === 7 ? `${key}-01` : key,
          dataGranularity,
        ),
        ads: v.ads,
        visits: v.visits,
      }));

    const visits = kpis.reduce((s, k) => s + (k.visits || 0), 0);
    const ads = kpis.reduce((s, k) => s + (k.adsInvestment || 0), 0);
    const orders = kpis.reduce((s, k) => s + (k.tsi || 0), 0);
    const cpv = visits > 0 ? ads / visits : 0;
    const cvr = visits > 0 ? (orders / visits) * 100 : 0;
    return { series, visits, ads, cpv, cvr, orders };
  }, [kpis, dataGranularity]);

  return (
    <section className="space-y-3" aria-labelledby="growth-traffic-title">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Seção 2 · Meso
          </p>
          <h2 id="growth-traffic-title" className="text-lg font-semibold text-slate-900 tracking-tight">
            Eficiência de Tráfego & Aquisição
          </h2>
          <p className="text-sm text-slate-500">
            Correlação investimento × visitas · {periodLabel}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 mb-3">
            Ads × Volume de visitas
          </p>
          {series.length === 0 ? (
            <p className="text-sm text-slate-500 py-16 text-center">Sem série no período.</p>
          ) : (
            <div className="h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthAdsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_ADS} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={SERIES_ADS} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: AXIS_TICK_FONT_SIZE, fill: CHART_AXIS_STROKE }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="ads"
                    tick={{ fontSize: AXIS_TICK_FONT_SIZE, fill: CHART_AXIS_STROKE }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtMoneyGrowth(Number(v))}
                    width={64}
                  />
                  <YAxis
                    yAxisId="visits"
                    orientation="right"
                    tick={{ fontSize: AXIS_TICK_FONT_SIZE, fill: CHART_AXIS_STROKE }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtIntGrowth(Number(v))}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid rgba(226,232,240,0.9)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) =>
                      name === "ads"
                        ? [fmtMoneyGrowth(value), "Investimento Ads"]
                        : [fmtIntGrowth(value), "Visitas"]
                    }
                  />
                  <Legend
                    formatter={(n) => (n === "ads" ? "Investimento Ads" : "Visitas")}
                    wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                  />
                  <Area
                    yAxisId="ads"
                    type="monotone"
                    dataKey="ads"
                    name="ads"
                    stroke={SERIES_ADS}
                    fill="url(#growthAdsFill)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="visits"
                    type="monotone"
                    dataKey="visits"
                    name="visits"
                    stroke={SERIES_VISITS}
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <GrowthMetricCard
            icon={Eye}
            label="Visitas Totais"
            value={fmtIntGrowth(visits)}
            hint={`${fmtIntGrowth(orders)} pedidos no período`}
          />
          <GrowthMetricCard
            icon={Coins}
            label="Custo por Visita (CPV)"
            value={fmtCpvGrowth(cpv)}
            hint={ads > 0 ? `Ads ${fmtMoneyGrowth(ads)} ÷ visitas` : "Sem investimento no período"}
          />
          <GrowthMetricCard
            icon={Percent}
            label="Taxa de Conversão Global"
            value={
              visits > 0
                ? `${cvr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                : "—"
            }
            hint="Pedidos ÷ visitas — consolidada da loja"
          />
        </div>
      </div>
    </section>
  );
}

export default TrafficEfficiencySection;
