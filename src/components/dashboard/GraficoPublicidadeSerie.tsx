import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { brl, brlCurto, num } from "@/lib/format";
import type { PontoPublicidade } from "@/lib/sinergiaPublicidade";

export default function GraficoPublicidadeSerie({ pontos, compacto = false }: { pontos: PontoPublicidade[]; compacto?: boolean }) {
  const mobile = useIsMobile();
  const [semanal, setSemanal] = useState(false);
  const grupos = new Map<string, PontoPublicidade[]>();
  for (const p of pontos) {
    const data = new Date(`${p.data}T12:00:00Z`);
    if (semanal) data.setUTCDate(data.getUTCDate() - (data.getUTCDay() + 6) % 7);
    const chave = semanal ? data.toISOString().slice(0, 10) : p.data;
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  }
  const serie = [...grupos].sort(([a], [b]) => a.localeCompare(b)).map(([data, ps]) => {
    const soma = (campo: "faturamento" | "investimento" | "receitaAds") => ps.every(p => p[campo] != null && Number.isFinite(p[campo])) ? ps.reduce((s, p) => s + (p[campo] ?? 0), 0) : null;
    const investimento = soma("investimento"), receitaAds = soma("receitaAds");
    return { data, faturamento: soma("faturamento"), investimento, receitaAds, roas: investimento != null && investimento > 0 && receitaAds != null ? receitaAds / investimento : null };
  });
  return <div className="space-y-3" aria-label="Gráfico Faturamento Ads ROAS">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="text-sm font-semibold">Faturamento × Ads × ROAS</h4>
      {!compacto && <div className="flex gap-1" role="group" aria-label="Agrupar evolução">
        <Button size="sm" variant={semanal ? "ghost" : "secondary"} aria-pressed={!semanal} onClick={() => setSemanal(false)}>Dia</Button>
        <Button size="sm" variant={semanal ? "secondary" : "ghost"} aria-pressed={semanal} onClick={() => setSemanal(true)}>Semana</Button>
      </div>}
    </div>
    <div className={compacto ? "h-[220px]" : "h-[340px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={serie} barCategoryGap="35%" margin={{ top: 12, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="data" tickFormatter={d => d.slice(5).split('-').reverse().join('/')} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={mobile ? 40 : 30} height={36} padding={{ left: 12, right: 12 }} />
          <YAxis yAxisId="faturamento" width={70} tickCount={mobile ? 4 : 5} tickFormatter={brlCurto} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="ads" orientation="right" width={65} tickCount={mobile ? 4 : 5} tickFormatter={brlCurto} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="roas" hide domain={[0, 'auto']} />
          <Tooltip content={({ active, payload, label }) => {
            const p = payload?.[0]?.payload;
            if (!active || !p) return null;
            return <div className="panel-glass-tooltip space-y-2 p-3 text-xs tabular-nums">
              <p className="text-muted-foreground">{String(label).split('-').reverse().join('/')}</p>
              <p>Faturamento: {p.faturamento == null ? 'Sem dado' : brl(p.faturamento)}</p>
              <p>Investimento Ads: {p.investimento == null ? 'Sem dado' : brl(p.investimento)}</p>
              <p>Vendas por Ads: {p.receitaAds == null ? 'Sem dado' : brl(p.receitaAds)}</p>
              <p>ROAS: {p.roas == null ? 'Sem dado' : `${num(p.roas, 2)}x`}</p>
            </div>;
          }} />
          <Line yAxisId="faturamento" dataKey="faturamento" stroke="hsl(var(--panel-positive))" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          <Line yAxisId="ads" dataKey="investimento" stroke="hsl(var(--panel-text-secondary))" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          <Line yAxisId="roas" dataKey="roas" stroke="hsl(var(--panel-text))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-muted-foreground">Faturamento: linha verde, eixo esquerdo · Investimento Ads: linha cinza, eixo direito · ROAS: linha pontilhada, escala própria em x.</p>
  </div>;
}