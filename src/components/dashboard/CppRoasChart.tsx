import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { DailyRoasPoint } from "@/utils/cppAggregation";

const DOW_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  dailyRoas: DailyRoasPoint[];
  dowBenchmark: Record<number, number>;
}

export default function CppRoasChart({ dailyRoas, dowBenchmark }: Props) {
  const chartData = useMemo(() => {
    // ERRO 7: Filter out days where INV_PADS = 0 (no ads data)
    return dailyRoas
      .filter(d => d.invPads > 0)
      .map(d => ({
        date: d.date,
        roas: d.roas !== null ? Math.round(d.roas * 100) / 100 : null,
        benchmark: Math.round((dowBenchmark[d.dow] || 0) * 100) / 100,
        dowLabel: DOW_NAMES[d.dow],
      }));
  }, [dailyRoas, dowBenchmark]);

  if (chartData.length < 2) return null;

  const formatDate = (v: string) => {
    const parts = v.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return v;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          ROAS Diário vs Referência por Dia da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={formatDate}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(v) => `${v}x`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  `${value?.toFixed(2)}x`,
                  name === "roas" ? "ROAS Real" : "Referência",
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.date === label);
                  return `${formatDate(label)} (${item?.dowLabel || ""})`;
                }}
              />
              <Legend
                formatter={(value) => (value === "roas" ? "ROAS Real" : `Referência (${value})`)}
              />
              <Line
                type="monotone"
                dataKey="roas"
                name="roas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={chartData.length < 40 ? { r: 3 } : false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Benchmark DOW"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
