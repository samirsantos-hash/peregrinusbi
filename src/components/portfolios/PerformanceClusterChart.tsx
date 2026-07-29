import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingDown, TrendingUp, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip as UTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  const { data, tracionadores, detratores, total } = useMemo(() => {
    const sorted = [...sellers]
      .filter((s) => s.tgmvLc > 0)
      .sort((a, b) => b.tgmvLc - a.tgmvLc);
    const total = sorted.reduce((s, x) => s + x.tgmvLc, 0);
    const n = sorted.length;
    const topCut = Math.max(1, Math.ceil(n * (topPct / 100)));
    const botCutRaw = Math.max(1, Math.ceil(n * (botPct / 100)));
    const botCut = Math.min(botCutRaw, Math.max(0, n - topCut));

    let acc = 0;
    const data = sorted.map((s, i) => {
      const isTop = i < topCut;
      const isBot = i >= n - botCut && !isTop;
      const share = total > 0 ? (s.tgmvLc / total) * 100 : 0;
      acc += share;
      return {
        rank: i + 1,
        name: aliases[s.custId] || s.nickname,
        custId: s.custId,
        tgmv: s.tgmvLc,
        share,
        acumulado: acc,
        cluster: isTop ? "Tracionador" : isBot ? "Detrator" : "Médio",
      };
    });

    return {
      data,
      total,
      tracionadores: data.filter((d) => d.cluster === "Tracionador"),
      detratores: data.filter((d) => d.cluster === "Detrator"),
    };
  }, [sellers, aliases, topPct, botPct]);

  if (data.length === 0) return null;

  const clusterClass = (cluster: string) =>
    cluster === "Tracionador"
      ? "border-primary/40 bg-primary/10 text-primary"
      : cluster === "Detrator"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-border bg-muted/40 text-muted-foreground";

  const topShare = tracionadores.reduce((s, x) => s + x.share, 0);
  const botShare = detratores.reduce((s, x) => s + x.share, 0);
  const medios = data.length - tracionadores.length - detratores.length;

  return (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Cluster de Desempenho — Desempenho da Marca</h3>
              <TooltipProvider delayDuration={150}>
                <UTooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                    Tabela ordenada do maior para o menor TGMV, com share individual e share acumulado
                    sobre o total da marca. Use os controles para ajustar o corte de Tracionadores
                    (líderes) e Detratores (cauda).
                  </TooltipContent>
                </UTooltip>
              </TooltipProvider>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data.length} sellers · ordenados por faturamento (TGMV)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
              <div className="font-bold">Total da marca</div>
              <div className="text-[11px] text-muted-foreground tabular-nums">{fmtBRL(total)}</div>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-primary font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                {tracionadores.length} Tracionadores
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">{topShare.toFixed(1)}% do GMV</div>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-destructive font-bold">
                <TrendingDown className="w-3.5 h-3.5" />
                {detratores.length} Detratores
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">{botShare.toFixed(1)}% do GMV</div>
            </div>
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

        <div className="rounded-md border border-border overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Loja</th>
                  <th className="px-3 py-2 text-right font-semibold">TGMV</th>
                  <th className="px-3 py-2 text-right font-semibold">Share</th>
                  <th className="px-3 py-2 text-right font-semibold">Acumulado</th>
                  <th className="px-3 py-2 text-right font-semibold">Cluster</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.custId} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{d.rank}</td>
                    <td className="px-3 py-1.5 font-medium truncate max-w-[240px]">{d.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(d.tgmv)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{d.share.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                      {d.acumulado.toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${clusterClass(d.cluster)}`}>
                        {d.cluster}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-muted/60 backdrop-blur">
                <tr className="border-t border-border text-xs font-bold">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">Total da marca · {data.length} lojas</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(total)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">100,0%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {medios} médios
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
