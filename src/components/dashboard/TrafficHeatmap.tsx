import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { analiseDiaria, type DiaAnalise } from "@/lib/analiseDiaria";
import { num, numCurto, pct, brlCurto } from "@/lib/format";
import NumeroAnimado from "@/components/ds/NumeroAnimado";
import TooltipInfo from "./TooltipInfo";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
interface Props { kpis: DiaAnalise[]; from?: string; to?: string }
const TrafficHeatmap = ({ kpis, from, to }: Props) => {
  const a = useMemo(() => analiseDiaria(kpis, from, to), [kpis, from, to]);
  if (!a || !a.diasComDado) return <p className="text-sm text-muted-foreground">Sem registros diários no período para analisar os dias da semana.</p>;
  const data = a.semana.map((s) => ({ ...s, nome: DIAS[s.dia] }));
  const melhor = [...data].sort((a, b) => (b.visitasMedia ?? -1) - (a.visitasMedia ?? -1))[0];
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 glass-card p-4 sm:p-5 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Tráfego por dia da semana</h3>
          <TooltipInfo text="Visitas por ocorrência: total de visitas de cada dia da semana dividido pelo número de datas com registro. Sem estimativas horárias. Conversão = unidades vendidas ÷ visitas." />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[["Visitas", numCurto(a.visitas)], ["Unidades vendidas", numCurto(a.unidades)], ["Conversão", pct(a.visitas > 0 ? a.unidades / a.visitas * 100 : null, 2)]].map(([label, value]) => (
            <div key={label} className="min-w-0"><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-base font-semibold tabular-nums break-words"><NumeroAnimado valor={value} /></p></div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--grid))" />
            <XAxis type="number" tickFormatter={(v) => numCurto(v)} tick={{ fill: "hsl(var(--axis))", fontSize: 11 }} axisLine={false} />
            <YAxis type="category" dataKey="nome" width={65} tick={{ fill: "hsl(var(--axis))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} content={({ active, payload }) => {
              const d = payload?.[0]?.payload;
              if (!active || !d) return null;
              return <div className="glass-card p-3 text-xs space-y-1"><p className="font-semibold">{d.nome} · {d.ocorrencias} ocorrências</p><p>Visitas por ocorrência: {num(d.visitasMedia, 1)}</p><p>Unidades por ocorrência: {num(d.unidadesMedia, 1)}</p><p>Conversão: {pct(d.conversao, 2)}</p><p>Faturamento total: {brlCurto(d.faturamento)}</p></div>;
            }} />
            <Bar name="Visitas por ocorrência" dataKey="visitasMedia" fill="hsl(var(--neon-blue))" radius={[0, 4, 4, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[11px] tabular-nums"><thead className="text-muted-foreground"><tr><th className="text-left py-2">Dia</th><th className="text-right">Ocorrências</th><th className="text-right">Unidades / ocorrência</th><th className="text-right">Conversão</th></tr></thead><tbody>{data.map((d) => <tr key={d.dia} className="border-t border-border/40"><td className="py-2">{d.nome}</td><td className="text-right">{d.ocorrencias}</td><td className="text-right">{num(d.unidadesMedia, 1)}</td><td className="text-right">{pct(d.conversao, 2)}</td></tr>)}</tbody></table>
        </div>
      </div>
      <aside className="glass-card p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Leitura do Consultor</h3>
        <p className="text-xs text-muted-foreground">Amostra: {a.diasComDado} de {a.dias} dias do período; {num(Math.min(...data.map((d) => d.ocorrencias)))} a {num(Math.max(...data.map((d) => d.ocorrencias)))} ocorrências por dia da semana.</p>
        {a.leituraSemanal && a.visitas > 0 ? <p className="text-sm leading-relaxed">{melhor.nome} apresenta a maior média de visitas por ocorrência ({num(melhor.visitasMedia, 1)}). A comparação descreve o histórico, sem comprovar que aumentar anúncios nesse dia gera mais vendas.</p> : <p className="text-sm leading-relaxed">Amostra insuficiente para recomendar dias da semana: são necessárias pelo menos quatro ocorrências com registro de cada dia.</p>}
        <p className="text-xs text-muted-foreground">Horários não são analisados: faltam registros horários reais. Datas sem registro não entram como ocorrências observadas.</p>
      </aside>
    </section>
  );
};
export default TrafficHeatmap;
