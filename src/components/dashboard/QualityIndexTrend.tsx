import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoBbf } from "@/lib/qualityIndex";

const fmt1 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function rotuloData(d: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [, m, dia] = d.slice(0, 10).split("-");
    return `${dia}/${m}`;
  }
  if (/^\d{4}-\d{2}$/.test(d)) {
    const [a, m] = d.split("-");
    return `${m}/${a.slice(2)}`;
  }
  return d;
}

interface Props {
  serie: PontoBbf[];
  /** meta inferior da faixa recomendada */
  meta?: number;
}

const QualityIndexTrend = ({ serie, meta = 80 }: Props) => {
  if (!serie || serie.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-muted/10 px-3 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-alt mb-1">Evolução do índice</p>
        <p className="text-[12px] text-muted-foreground leading-snug">
          Base insuficiente para a linha do tempo: o período selecionado tem
          {serie?.length === 1 ? " apenas um período" : " nenhum período"} com os blocos medidos.
        </p>
      </div>
    );
  }

  const dados = serie.map((p) => ({ ...p, rotulo: rotuloData(p.data) }));
  const valores = dados.map((d) => d.valor);
  const min = Math.min(...valores, meta);
  const max = Math.max(...valores, meta);
  const folga = Math.max(2, (max - min) * 0.15);
  const primeiro = valores[0];
  const ultimo = valores[valores.length - 1];
  const delta = ultimo - primeiro;

  return (
    <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-alt">
          Evolução do índice no período selecionado
        </p>
        <span
          className={
            "text-[12px] font-mono tabular-nums " +
            (delta > 0.05 ? "text-ok" : delta < -0.05 ? "text-crit" : "text-muted-alt")
          }
        >
          {delta >= 0 ? "+" : "−"}
          {fmt1(Math.abs(delta))} pts
        </span>
      </div>

      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="rotulo"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              domain={[Math.max(0, min - folga), Math.min(100, max + folga)]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            <ReferenceLine
              y={meta}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `meta ${meta}`, position: "right", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [fmt1(v), "Quality Index"]}
              labelFormatter={(l) => `Período: ${l}`}
            />
            <Line
              type="linear"
              dataKey="valor"
              stroke="hsl(var(--brand-blue))"
              strokeWidth={2}
              dot={{ r: 2.5 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Linha do SCORE_FINAL_BBF por período com dado medido. Serve de base comparativa: registre o valor de hoje
        antes de aplicar as correções e acompanhe o deslocamento da curva depois.
      </p>
    </div>
  );
};

export default QualityIndexTrend;
