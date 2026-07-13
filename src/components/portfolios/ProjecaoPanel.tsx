import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
  Legend,
} from "recharts";
import { useCrescimentoMensal } from "@/hooks/useCrescimentoMensal";
import { forecastHibrido, inclinacaoLog, classificarTendencia } from "@/lib/forecast";
import { withMovingAverage } from "@/utils/movingAverage";

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

interface Props {
  custIds: string[];
  portfolioName: string;
}

export default function ProjecaoPanel({ custIds, portfolioName }: Props) {
  const { data, isLoading } = useCrescimentoMensal(custIds);
  const [horizonte, setHorizonte] = useState<1 | 3 | 6>(3);

  const fc = useMemo(() => {
    if (!data?.receita?.length) return null;
    return forecastHibrido(data.receita, horizonte, 0.4);
  }, [data, horizonte]);

  const tendencia = useMemo(() => {
    if (!data?.receita?.length) return null;
    const slope = inclinacaoLog(data.receita, 6);
    return { slope, ...classificarTendencia(slope) };
  }, [data]);

  const chartData = useMemo(() => {
    if (!data?.pontos?.length) return [];
    const real = data.pontos.map((p) => ({ mes: p.mes, real: p.receita }));
    const fcRows = (fc?.pontos ?? []).map((p) => ({
      mes: p.mes,
      proj: p.valor,
      lower: p.lower,
      upper: p.upper,
      band: [p.lower, p.upper] as [number, number],
    }));
    const merged = [...real, ...fcRows];
    return withMovingAverage(merged, "real", "ma3real", 3);
  }, [data, fc]);

  const projTotal = useMemo(
    () => (fc?.pontos ?? []).reduce((s, p) => s + p.valor, 0),
    [fc]
  );

  const ultimo = data?.pontos?.[data.pontos.length - 1];
  const anterior = data?.pontos?.[data.pontos.length - 2];
  const mom = ultimo && anterior && anterior.receita > 0
    ? ((ultimo.receita - anterior.receita) / anterior.receita) * 100
    : null;

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Projeção de Crescimento — {portfolioName}</h3>
          </div>
          <div className="flex items-center gap-1">
            {[1, 3, 6].map((h) => (
              <Button
                key={h}
                size="sm"
                variant={horizonte === h ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setHorizonte(h as 1 | 3 | 6)}
              >
                {h}m
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Calculando projeção…</p>
        ) : !data?.pontos?.length ? (
          <p className="text-xs text-muted-foreground">Sem histórico mensal disponível.</p>
        ) : fc?.insuficiente ? (
          <p className="text-xs text-muted-foreground">{fc.diagnostico}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita Projetada ({horizonte}m)</p>
                <p className="text-lg font-bold tabular-nums">{fmtBRL(projTotal)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último Mês</p>
                <p className="text-lg font-bold tabular-nums">{ultimo ? fmtBRL(ultimo.receita) : "—"}</p>
                {mom != null && (
                  <p className={`text-xs ${mom >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {mom >= 0 ? "+" : ""}{mom.toFixed(1)}% MoM
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tendência (6m)</p>
                <p className="text-lg font-bold" style={{ color: tendencia?.cor }}>{tendencia?.rotulo ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">slope log {tendencia ? tendencia.slope.toFixed(3) : "—"}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversão Atual</p>
                <p className="text-lg font-bold tabular-nums">{ultimo ? ultimo.cr.toFixed(2) : "—"}%</p>
                <p className="text-[10px] text-muted-foreground">AOV {ultimo ? fmtBRL(ultimo.aov) : "—"}</p>
              </div>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: any, name: any) => [typeof v === "number" ? fmtBRL(v) : v, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="band" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.12} name="IC95" />
                  <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Receita real" />
                  <Line type="monotone" dataKey="ma3real" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.6} dot={false} connectNulls name="MM3 real" />
                  <Line type="monotone" dataKey="proj" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Projeção" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {fc?.diagnostico && (
              <p className="text-[10px] text-muted-foreground">{fc.diagnostico}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}