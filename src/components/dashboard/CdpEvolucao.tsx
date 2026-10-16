import { useMemo, useState } from "react";
import { Activity, Target, TrendingUp } from "lucide-react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, ReferenceLine } from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KpiCard } from "@/components/ds";
import { evolucaoCdp, META_CDP, type DiaCdp } from "@/lib/cdpEvolucao";
import { brlCurto, num, pct } from "@/lib/format";

export default function CdpEvolucao({ rows }: { rows: DiaCdp[] }) {
  const [periodo, setPeriodo] = useState("90");
  const serie = useMemo(() => evolucaoCdp(rows), [rows]);
  const ultimo = serie[serie.length - 1];
  const pontos = useMemo(() => {
    if (periodo === "all" || !ultimo) return serie;
    const corte = Date.parse(`${ultimo.date}T00:00:00Z`) - (Number(periodo) - 1) * 86400000;
    return serie.filter((p) => Date.parse(`${p.date}T00:00:00Z`) >= corte);
  }, [serie, ultimo, periodo]);
  if (!ultimo) return <div className="py-6 text-sm text-muted-foreground">Sem histórico diário de participação CDP nesta seleção.</div>;
  return (
    <section className="space-y-4" aria-label="Evolução CDP">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0"><Activity className="h-5 w-5 shrink-0 text-primary" /><h3 className="text-base font-semibold">CDP · participação e pontuação</h3></div>
        <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && setPeriodo(v)} aria-label="Período da evolução CDP">
          {["30", "90", "180", "all"].map((v) => <ToggleGroupItem key={v} value={v} className="h-8 px-3 text-xs">{v === "all" ? "Tudo" : `${v}D`}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard rotulo="Participação CDP" valor={pct(ultimo.participacao)} referencia={`Meta ≥ ${pct(META_CDP, 0)} do faturamento · últimos 30 dias`} />
        <KpiCard rotulo="Pontuação de atingimento" valor={`${num(ultimo.pontuacao)} / 100`} referencia={`100 pontos ao atingir ${pct(META_CDP, 0)} de participação`} />
        <KpiCard rotulo="Faturamento com CDP" valor={brlCurto(ultimo.cdp)} referencia={`de ${brlCurto(ultimo.faturamento)} · ${ultimo.dias}/30 dias com dados`} />
      </div>
      <div className="rounded-lg border border-border bg-card p-3 sm:p-5">
        <div className="h-[280px] w-full min-w-0" role="img" aria-label="Gráfico de participação CDP em percentual e pontuação de atingimento em 100 pontos">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pontos} margin={{ top: 12, right: 4, bottom: 8, left: -15 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--grid))" />
              <XAxis dataKey="date" tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`} minTickGap={35} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="participacao" domain={[0, 100]} tickFormatter={(v: number) => pct(v, 0)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="pontuacao" orientation="right" domain={[0, 100]} tickFormatter={(v: number) => num(v)} tick={{ fontSize: 11 }} width={35} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={(d) => String(d).split("-").reverse().join("/")} formatter={(v: number, name: string) => [name === "Participação CDP" ? pct(v) : `${num(v, 1)} / 100`, name]} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="participacao" y={META_CDP} stroke="hsl(var(--media))" strokeDasharray="5 5" />
              <Line yAxisId="participacao" dataKey="participacao" name="Participação CDP" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={pontos.length < 3} activeDot={{ r: 5 }} connectNulls={false} />
              <Line yAxisId="pontuacao" dataKey="pontuacao" name="Pontuação de atingimento" type="monotone" stroke="hsl(var(--ec-laranja))" strokeWidth={2.5} dot={pontos.length < 3} activeDot={{ r: 5 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-media" />Meta: {pct(META_CDP, 0)}</span>
          <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-primary" />Cada ponto considera os 30 dias anteriores, incluindo o dia</span>
        </div>
      </div>
      <details className="border-t border-border pt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer text-foreground">Critérios da análise</summary>
        <p className="mt-2 leading-relaxed">Participação = faturamento com CDP ÷ faturamento bruto dos mesmos 30 dias × 100. Pontuação = participação ÷ {pct(META_CDP, 0)} × 100, limitada a 100. É uma pontuação de atingimento da meta de promoção da carteira, não a nota oficial do Mercado Livre; as duas curvas são relacionadas, não indicadores independentes. Dias sem dados ficam como lacunas. A cobertura informa quantos dias têm registros, sem estimar os ausentes.</p>
      </details>
      {ultimo.inconsistente && <p className="text-xs text-destructive">O faturamento CDP supera o faturamento bruto nesta janela; participação e pontuação aguardam revisão.</p>}
    </section>
  );
}