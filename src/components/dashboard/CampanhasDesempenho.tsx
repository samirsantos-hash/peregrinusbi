import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Megaphone } from "lucide-react";
import type { EligibilityItem } from "@/hooks/useEligibility";
import { analisarCampanhas, QUEDA_MINIMA, type AnuncioAlerta } from "@/lib/campanhasDesempenho";
import { num, pct } from "@/lib/format";

const data = (d?: string) => (d ? d.split("-").reverse().join("/") : "—");

function Lista({ titulo, vazio, itens, tipo }: { titulo: string; vazio: string; itens: AnuncioAlerta[]; tipo: "queda" | "competitividade" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 min-w-0">
      <h4 className="text-sm font-semibold mb-1">{titulo} <span className="text-muted-foreground font-normal tabular-nums">({itens.length})</span></h4>
      {itens.length === 0 ? <p className="text-xs text-muted-foreground py-3">{vazio}</p> : (
        <ul className="divide-y divide-border max-h-[320px] overflow-auto">
          {itens.slice(0, 30).map((i) => (
            <li key={i.itemId} className="py-2 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <a href={i.link || undefined} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-primary">{i.nome || i.itemId}</a>
                <span className="text-muted-foreground">{i.itemId} · {i.campanha}</span>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                {tipo === "queda" ? (
                  <><div className="text-destructive font-semibold">{pct((i.variacao ?? 0) * 100, 1)}</div><div className="text-muted-foreground">{num(i.anterior ?? 0, 1)} → {num(i.atual, 1)} un/dia</div></>
                ) : (
                  <><div className="font-semibold">{pct(i.descontoAtual, 1)} → {pct(i.descontoMelhor, 1)}</div><div className="text-muted-foreground">desconto atual → melhor oferta</div></>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CampanhasDesempenho({ items }: { items: EligibilityItem[] }) {
  const r = useMemo(() => analisarCampanhas(items), [items]);
  if (!r.ultima) return <div className="py-6 text-sm text-muted-foreground">Sem dados de campanhas nesta seleção.</div>;
  return (
    <section className="space-y-4" aria-label="Desempenho de campanhas">
      <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /><h3 className="text-base font-semibold">Desempenho por campanha</h3>
        <span className="text-xs text-muted-foreground">leitura de {data(r.ultima)}{r.anterior ? ` vs ${data(r.anterior)}` : ""}</span></div>
      <div className="rounded-lg border border-border bg-card p-3 sm:p-5">
        <div className="h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.campanhas} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--grid))" />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => num(v)} />
              <YAxis type="category" dataKey="rotulo" width={130} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, _n, p: any) => [`${num(v, 1)} un/dia · ${pct(p.payload.participacao * 100, 1)} · ${p.payload.anuncios} anúncios`, "Vendas"]} />
              <Bar dataKey="unidadesDia" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Unidades vendidas por dia (média de 7 dias) de cada campanha. A planilha não traz o faturamento por anúncio, então o TGMV por campanha fica sem dado.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Lista tipo="queda" titulo="Vendas em queda sem campanha" vazio={r.anterior ? `Nenhum anúncio fora de campanha caiu ${pct(QUEDA_MINIMA * 100, 0)} ou mais.` : "Falta uma leitura anterior para comparar."} itens={r.quedaSemCampanha} />
        <Lista tipo="competitividade" titulo="Campanhas de baixa competitividade" vazio="Todos os anúncios em campanha já estão na melhor oferta." itens={r.baixaCompetitividade} />
      </div>
    </section>
  );
}
