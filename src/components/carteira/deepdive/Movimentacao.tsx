import { useNavigate } from "react-router-dom";
import type { movimentacao } from "@/lib/carteiraDeepDive/calculo";
import { brl, dataBR } from "./fmt";

type Mov = ReturnType<typeof movimentacao>;
type Item = Mov["entrando"][number];

function Tabela({ itens, rotuloData, vazio }: { itens: Item[]; rotuloData: string; vazio: string }) {
  const nav = useNavigate();
  if (!itens.length) return <p className="text-[11px] text-muted-foreground py-2">{vazio}</p>;
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-xs">
        <thead className="text-muted-foreground"><tr className="border-b border-border/40">
          <th className="text-left py-1">Loja</th><th className="text-left">{rotuloData}</th><th className="text-right">Faturamento</th>
        </tr></thead>
        <tbody>
          {itens.map((s) => (
            <tr key={s.loja.id} onClick={() => nav(`/lojas/${s.loja.id}`)} className="border-b border-border/20 cursor-pointer hover:bg-muted/40">
              <td className="py-1">{s.loja.nickname}</td><td>{dataBR(s.data)}</td>
              <td className="text-right tabular-nums">{s.gmv === null ? "Sem dado" : brl(s.gmv)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Movimentacao({ m }: { m: Mov }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-border/50 bg-card/60 p-3">
        <h3 className="text-sm font-semibold mb-2">Entrando <span className="text-muted-foreground font-normal text-xs">({m.entrando.length})</span></h3>
        <Tabela itens={m.entrando} rotuloData="Entrada" vazio="Nenhuma loja entrou neste mês." />
      </div>
      <div className="rounded-lg border border-border/50 bg-card/60 p-3">
        <h3 className="text-sm font-semibold">Saindo · risco de churn</h3>
        <p className="text-xs text-muted-foreground mb-2">Saída prevista até {dataBR(m.limiteSaida)}</p>
        <p className="text-xl font-bold tabular-nums text-[hsl(var(--crit))]">{brl(m.emRisco)} <span className="text-xs font-normal text-muted-foreground">em risco · {m.saindo.length} lojas</span></p>
        <Tabela itens={m.saindo} rotuloData="Saída prevista" vazio="Nenhuma loja com receita saindo." />
        <h4 className="text-xs font-semibold mt-3 mb-1">Saindo sem faturamento no período ({m.saindoSemReceita.length})</h4>
        <Tabela itens={m.saindoSemReceita} rotuloData="Saída prevista" vazio="Nenhuma." />
      </div>
    </section>
  );
}
