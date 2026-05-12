import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

interface Props {
  sellers: SellerWithKpi[];
  aliases?: Record<string, string>;
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Performance cluster: Pareto-style curve from highest to lowest TGMV.
 * Top 20% = Tracionadores (drivers), Bottom 20% = Detratores (laggards).
 */
export default function PerformanceClusterChart({ sellers, aliases = {} }: Props) {
  const [topPct, setTopPct] = useState(20);
  const [botPct, setBotPct] = useState(20);

  const { data, tracionadores, detratores } = useMemo(() => {
    const sorted = [...sellers]
      .filter((s) => s.tgmvLc > 0)
      .sort((a, b) => b.tgmvLc - a.tgmvLc);
    const total = sorted.reduce((s, x) => s + x.tgmvLc, 0);
    const n = sorted.length;
    const topCut = Math.max(1, Math.ceil(n * (topPct / 100)));
    const botCutRaw = Math.max(1, Math.ceil(n * (botPct / 100)));
    const botCut = Math.min(botCutRaw, Math.max(0, n - topCut));

    const data = sorted.map((s, i) => {
      const isTop = i < topCut;
      const isBot = i >= n - botCut && !isTop;
      return {
        name: aliases[s.custId] || s.nickname,
        custId: s.custId,
        tgmv: s.tgmvLc,
        share: total > 0 ? (s.tgmvLc / total) * 100 : 0,
        cluster: isTop ? "Tracionador" : isBot ? "Detrator" : "Médio",
      };
    });

    return {
      data,
      tracionadores: data.filter((d) => d.cluster === "Tracionador"),
      detratores: data.filter((d) => d.cluster === "Detrator"),
    };
  }, [sellers, aliases, topPct, botPct]);

  if (data.length === 0) return null;

  const colorFor = (cluster: string) =>
    cluster === "Tracionador" ? "hsl(var(--primary))" :
    cluster === "Detrator" ? "hsl(var(--destructive))" :
    "hsl(var(--muted-foreground))";

  const topShare = tracionadores.reduce((s, x) => s + x.share, 0);
  const botShare = detratores.reduce((s, x) => s + x.share, 0);

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Cluster de Desempenho — Curva de Faturamento</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-primary">
              <TrendingUp className="w-3.5 h-3.5" />
              <strong>{tracionadores.length}</strong> Tracionadores · {topShare.toFixed(1)}% do GMV
            </span>
            <span className="flex items-center gap-1.5 text-destructive">
              <TrendingDown className="w-3.5 h-3.5" />
              <strong>{detratores.length}</strong> Detratores · {botShare.toFixed(1)}% do GMV
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border border-border bg-muted/20 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Tracionadores (Top)
              </span>
              <span className="tabular-nums font-bold text-primary">{topPct}%</span>
            </div>
            <Slider
              min={10}
              max={30}
              step={1}
              value={[topPct]}
              onValueChange={(v) => setTopPct(v[0])}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-destructive flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Detratores (Bottom)
              </span>
              <span className="tabular-nums font-bold text-destructive">{botPct}%</span>
            </div>
            <Slider
              min={10}
              max={30}
              step={1}
              value={[botPct]}
              onValueChange={(v) => setBotPct(v[0])}
            />
          </div>
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, _n, p: any) => [
                  `${fmtBRL(v)} (${p.payload.share.toFixed(1)}%)`,
                  p.payload.cluster,
                ]}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="tgmv" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={colorFor(d.cluster)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
            <p className="font-bold text-primary flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Tracionadores (Top 20%)
            </p>
            <p className="text-muted-foreground">
              {tracionadores.map((d) => d.name).join(", ") || "—"}
            </p>
          </div>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
            <p className="font-bold text-destructive flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Detratores (Bottom 20%)
            </p>
            <p className="text-muted-foreground">
              {detratores.map((d) => d.name).join(", ") || "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
