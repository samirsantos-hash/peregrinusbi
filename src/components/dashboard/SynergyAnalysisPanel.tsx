import { pearsonPareado } from "@/lib/sinergiaPublicidade";
import { num } from "@/lib/format";
import TooltipInfo from "./TooltipInfo";

const METRICAS = [
  { key: "gmv", label: "Faturamento" }, { key: "adsInvestment", label: "Ads" },
  { key: "visits", label: "Visitas" }, { key: "repCancellationsRate", label: "Cancelamentos" },
] as const;
const numero = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const intensidade = (r: number | null) => r == null ? "Sem dado" : Math.abs(r) >= .7 ? "Forte" : Math.abs(r) >= .4 ? "Moderada" : "Fraca";
const tom = (r: number | null) => r == null || Math.abs(r) < .4 ? "bg-muted/30 text-muted-foreground" : r > 0 ? "bg-ec-verde-txt/10 text-ec-verde-txt" : "bg-destructive/10 text-destructive";

export default function SynergyAnalysisPanel({ kpis, compacto = false }: { kpis: Record<string, unknown>[]; compacto?: boolean }) {
  const coef = (a: string, b: string) => pearsonPareado(kpis.map(k => [numero(k[a]), numero(k[b])]));
  const pares = METRICAS.slice(1).map(m => ({ label: m.label, r: coef(m.key, "gmv") }));
  return <section className="sinergia-operacional space-y-4" aria-label="Análise de sinergia operacional">
    <div className="flex items-center gap-2"><h4 className="text-sm font-semibold">Análise de sinergia operacional</h4>
      <TooltipInfo text="Pearson: r = Σ[(x − média x)(y − média y)] ÷ √[Σ(x − média x)² × Σ(y − média y)²]. Mínimo de 7 observações pareadas; série constante ou incompleta não vira zero." />
    </div>
    {!compacto && <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <caption className="mb-3 text-left text-muted-foreground">Matriz de correlação · Pearson</caption>
        <thead><tr><th />{METRICAS.map(m => <th key={m.key} className="p-2 font-medium text-muted-foreground">{m.label}</th>)}</tr></thead>
        <tbody>{METRICAS.map(a => <tr key={a.key}><th className="text-left font-medium text-muted-foreground">{a.label}</th>{METRICAS.map(b => {
          const r = coef(a.key, b.key);
          return <td key={b.key} className={`h-16 min-w-[64px] rounded-lg text-center ${tom(r)}`}><span className="block font-semibold tabular-nums">{a.key === b.key ? "—" : r == null ? "Sem dado" : num(r, 2)}</span>{a.key !== b.key && <span className="text-[10px]">{intensidade(r)}</span>}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>}
    {compacto && <div className="grid gap-3 sm:grid-cols-3">{pares.map(p => <div key={p.label} className={`rounded-lg border border-border p-3 ${tom(p.r)}`}>
      <p className="text-xs">{p.label} × faturamento</p><p className="mt-1 text-xl font-semibold tabular-nums">{p.r == null ? "Sem dado" : num(p.r, 2)}</p>
      {!compacto && <p className="mt-2 text-xs leading-5">{p.r == null ? "Sem observações suficientes ou sem variação na série." : `${intensidade(p.r)} associação ${p.r >= 0 ? "direta" : "inversa"} no período. Compare mix e sazonalidade antes de decidir.`}</p>}
    </div>)}</div>}
    <p className="text-xs text-muted-foreground">Associação não é causalidade nem promessa de retorno. Cancelamentos usam taxa no histórico e quantidade na API, identificadas pela fonte.</p>
    {!compacto && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Fórmula e critérios</summary><p className="mt-2">r = Σ[(x − média x)(y − média y)] ÷ √[Σ(x − média x)² × Σ(y − média y)²]. Pares da mesma data, mínimo 7; séries constantes e dados ausentes: Sem dado.</p></details>}
  </section>;
}
