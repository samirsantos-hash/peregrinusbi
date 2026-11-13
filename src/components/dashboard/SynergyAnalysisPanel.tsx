import { pearsonPareado } from "@/lib/sinergiaPublicidade";
import { num } from "@/lib/format";
import TooltipInfo from "./TooltipInfo";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { MoveUp, MoveDown, Minus, CalendarDays, GitCompareArrows, Search, ArrowDown } from "lucide-react";

const METRICAS = [
  { key: "gmv", label: "Faturamento" }, { key: "adsInvestment", label: "Ads" },
  { key: "visits", label: "Visitas" }, { key: "repCancellationsRate", label: "Cancelamentos" },
] as const;
const Setas = ({ r }: { r: number | null }) => r == null || Math.abs(r) < .2
  ? <span className="flex justify-center"><Minus size={12} aria-hidden /></span>
  : <span className="flex justify-center gap-0.5" aria-hidden><MoveUp size={12} />{r > 0 ? <MoveUp size={12} /> : <MoveDown size={12} />}</span>;
const leitura = (r: number | null) => r == null ? "" : Math.abs(r) < .2 ? "Sem relação clara" : r > 0 ? "Crescem juntos" : "Direções opostas";
const numero = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const intensidade = (r: number | null) => r == null ? "Sem dado" : Math.abs(r) >= .7 ? "Forte" : Math.abs(r) >= .4 ? "Moderada" : "Fraca";
const tom = (r: number | null) => {
  if (r == null) return "bg-transparent border border-border/40 text-muted-foreground";
  const a = Math.abs(r), pos = r > 0;
  if (a < .2) return "bg-foreground/[0.02] border border-border/30 text-muted-foreground";
  if (pos) return a >= .7 ? "bg-ec-verde-txt/25 border border-ec-verde-txt/40 text-ec-verde-txt" : a >= .4 ? "bg-ec-verde-txt/15 border border-ec-verde-txt/20 text-ec-verde-txt" : "bg-ec-verde-txt/5 border border-ec-verde-txt/10 text-ec-verde-txt";
  return a >= .7 ? "bg-destructive/25 border border-destructive/40 text-destructive" : a >= .4 ? "bg-destructive/15 border border-destructive/20 text-destructive" : "bg-destructive/5 border border-destructive/10 text-destructive";
};

export default function SynergyAnalysisPanel({ kpis, compacto = false }: { kpis: Record<string, unknown>[]; compacto?: boolean }) {
  const coef = (a: string, b: string) => pearsonPareado(kpis.map(k => [numero(k[a]), numero(k[b])]));
  const pares = METRICAS.slice(1).filter(m => m.key !== "repCancellationsRate").map(m => ({ label: m.label, r: coef(m.key, "gmv") }));
  const relacoes = METRICAS.slice(1).map(m => {
    const observacoes = kpis.filter(k => numero(k[m.key]) != null && numero(k.gmv) != null).length;
    return { label: m.label, r: coef(m.key, "gmv"), observacoes };
  });
  const medidas = relacoes.filter(p => p.r != null);
  return <section className="sinergia-operacional min-w-0 space-y-4" aria-label="Análise de sinergia operacional">
    <div className="flex items-center gap-2"><h4 className="text-sm font-semibold">Análise de sinergia operacional</h4>
      <TooltipInfo text="Pearson: r = Σ[(x − média x)(y − média y)] ÷ √[Σ(x − média x)² × Σ(y − média y)²]. Mínimo de 7 observações pareadas; série constante ou incompleta não vira zero." />
    </div>
    {!compacto && <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-border/50 p-3 text-[11px] text-muted-foreground" aria-label="Como ler a matriz">
      <span className="flex items-center gap-1 text-ec-verde-txt"><MoveUp size={12} /><MoveUp size={12} /> Verde: crescem juntos</span>
      <span className="flex items-center gap-1 text-destructive"><MoveUp size={12} /><MoveDown size={12} /> Vermelho: um sobe, o outro cai</span>
      <span className="flex items-center gap-1"><Minus size={12} /> Sem cor: sem relação clara</span>
      <span>Força: Forte ≥ 0,7 · Moderada ≥ 0,4 · Fraca abaixo</span>
    </div>}
    {!compacto && <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <caption className="mb-3 text-left text-muted-foreground">Matriz de correlação · Pearson</caption>
        <thead><tr><th />{METRICAS.map(m => <th key={m.key} className="p-2 font-medium text-muted-foreground">{m.label}</th>)}</tr></thead>
        <tbody>{METRICAS.map(a => <tr key={a.key}><th className="text-left font-medium text-muted-foreground">{a.label}</th>{METRICAS.map(b => {
          const r = coef(a.key, b.key);
          return <td key={b.key} className={`h-16 min-w-[64px] rounded-xl text-center backdrop-blur-xl transition-colors ${tom(r)}`}><span className="block font-semibold tabular-nums">{a.key === b.key ? "—" : r == null ? "Sem dado" : num(r, 2)}</span>{a.key !== b.key && r != null && <><Setas r={r} /><span className="block text-[10px] leading-tight">{leitura(r)}</span></>}{a.key !== b.key && <span className="text-[10px]">{intensidade(r)}</span>}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>}
    {compacto && <div className="grid gap-4">{pares.map(p => <div key={p.label} className={`rounded-lg border border-border p-4 ${tom(p.r)}`}>
      <p className="text-xs">{p.label} × faturamento</p><p className="mt-1 text-xl font-semibold tabular-nums">{p.r == null ? "Sem dado" : num(p.r, 2)}</p>
      <p className="mt-2 text-xs leading-5">{p.r == null ? "Sem observações suficientes ou sem variação na série." : `${intensidade(p.r)} associação ${p.r >= 0 ? "direta" : "inversa"} no período.`}</p>
    </div>)}</div>}
    <p className="text-xs text-muted-foreground">Associação não é causalidade nem promessa de retorno. Cancelamentos representam taxa ou quantidade conforme o período analisado; não são o valor mensal dos pedidos cancelados mostrado ao lado.</p>
    <div className="space-y-4 border-t border-border pt-4">
      <h5 className="text-sm font-semibold">Como os indicadores acompanham o faturamento</h5>
      <p className="text-xs leading-5 text-muted-foreground">O gráfico resume a coluna Faturamento da matriz. À direita de zero, os indicadores tendem a subir e cair juntos; à esquerda, tendem a seguir direções opostas. Mais perto de −1 ou +1 significa associação mais intensa; perto de zero, associação linear fraca. Não é percentual de vendas nem retorno de Ads.</p>
      {medidas.length > 0 ? <div className="h-52 min-w-0" role="img" aria-label={`Associações com faturamento: ${medidas.map(p => `${p.label}, ${num(p.r, 2)}, ${p.observacoes} observações`).join('; ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={medidas} layout="vertical" margin={{ top: 8, right: 16, bottom: 12, left: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" domain={[-1, 1]} ticks={[-1, -.5, 0, .5, 1]} tickFormatter={v => num(v, 1)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={96} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickLine={false} axisLine={false} />
            <ReferenceLine x={0} stroke="hsl(var(--foreground))" />
            <Tooltip cursor={false} content={({ active, payload }) => {
              const p = payload?.[0]?.payload as typeof medidas[number] | undefined;
              return active && p ? <div className="panel-glass-tooltip p-3 text-xs"><p>{p.label} × faturamento</p><p>r = {num(p.r, 2)} · {intensidade(p.r)}</p><p>{num(p.observacoes)} observações pareadas</p></div> : null;
            }} />
            <Bar dataKey="r" fill="hsl(var(--primary))" barSize={18} radius={4} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div> : <p className="text-xs text-muted-foreground">Gráfico indisponível: faltam observações pareadas ou variação nos indicadores.</p>}
      <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
        {relacoes.map(p => <li key={p.label}><strong className="text-foreground">{p.label} × faturamento: </strong>{p.r == null ? 'sem associação calculável; faltam pelo menos 7 observações ou variação na série.' : `r = ${num(p.r, 2)} · ${intensidade(p.r).toLowerCase()} · ${p.r > 0 ? 'tendem a variar na mesma direção' : p.r < 0 ? 'tendem a variar em direções opostas' : 'sem associação linear observada'}.`} {num(p.observacoes)} de {num(kpis.length)} observações pareadas.</li>)}
      </ul>
      <h5 className="text-sm font-semibold">Da observação à decisão</h5>
      <ol aria-label="Diagrama de interpretação da sinergia" className="space-y-2 text-xs">
        <li className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><div><strong>1. Comparar as mesmas datas</strong><p className="mt-1 leading-5 text-muted-foreground">Unir cada indicador ao faturamento da mesma observação. Ausências não viram zero.</p></div></li>
        <li aria-hidden className="pl-0.5"><ArrowDown className="h-3 w-3 text-muted-foreground" /></li>
        <li className="flex items-start gap-3"><GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><div><strong>2. Medir o movimento conjunto</strong><p className="mt-1 leading-5 text-muted-foreground">Pearson indica direção e intensidade. Exige ao menos 7 pares e variação nos dois indicadores.</p></div></li>
        <li aria-hidden className="pl-0.5"><ArrowDown className="h-3 w-3 text-muted-foreground" /></li>
        <li className="flex items-start gap-3"><Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><div><strong>3. Investigar antes de agir</strong><p className="mt-1 leading-5 text-muted-foreground">Preço, estoque, calendário e procura podem acompanhar os mesmos movimentos. A associação não prova que aumentar Ads gerará vendas nem que cancelamentos causaram queda.</p></div></li>
      </ol>
    </div>
    {!compacto && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Fórmula e critérios</summary><p className="mt-2">r = Σ[(x − média x)(y − média y)] ÷ √[Σ(x − média x)² × Σ(y − média y)²]. Pares da mesma data, mínimo 7; séries constantes e dados ausentes: Sem dado.</p></details>}
  </section>;
}
