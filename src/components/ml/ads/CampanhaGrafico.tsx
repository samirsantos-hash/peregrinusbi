import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Line, LineChart, Legend, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { brl, brlCurto, num, pctFracao } from "@/lib/format";
import { serieCampanha } from "@/lib/campanhaEvolucao";

export type LinhaDiaCampanha = {
  campaign_id: number | string;
  dia: string;
  cost: number | null;
  total_amount: number | null;
  clicks: number | null;
  prints: number | null;
  units_quantity: number | null;
};

type Metrica = "conjunto" | "roas" | "acos" | "tacos" | "cliques" | "cpc" | "ctr";
const METRICAS: { id: Metrica; rotulo: string; fmt: (v: number | null) => string }[] = [
  { id: "conjunto", rotulo: "Vendas e investimento", fmt: (v) => brl(v, true) },
  { id: "roas", rotulo: "ROAS", fmt: (v) => (v == null ? "Sem dado" : `${num(v, 2)}x`) },
  { id: "acos", rotulo: "ACOS", fmt: (v) => pctFracao(v, 1) },
  { id: "tacos", rotulo: "TACOS", fmt: (v) => pctFracao(v, 2) },
  { id: "cliques", rotulo: "Cliques", fmt: (v) => num(v) },
  { id: "cpc", rotulo: "CPC", fmt: (v) => brl(v, true) },
  { id: "ctr", rotulo: "CTR", fmt: (v) => pctFracao(v, 2) },
];

/** Same-date campaign sales and spend, with nullable auxiliary indicators. */
export default function CampanhaGrafico({ nome, linhas, faturamentoDia, aoFechar }: {
  nome: string;
  linhas: LinhaDiaCampanha[];
  faturamentoDia: { data: string; faturamento: number }[];
  aoFechar: () => void;
}) {
  const [m, setM] = useState<Metrica>("conjunto");
  const serie = useMemo(() => serieCampanha(linhas, faturamentoDia), [linhas, faturamentoDia]);
  const def = METRICAS.find((x) => x.id === m) ?? METRICAS[0];

  return (
    <div className="min-w-0 space-y-3" aria-label="Evolução diária da campanha">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="ds-rotulo">Campanha selecionada</p>
          <p className="text-sm font-medium truncate" title={nome}>{nome}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Fechar gráfico" onClick={aoFechar}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {METRICAS.map((x) => (
          <Button key={x.id} size="sm" variant={m === x.id ? "default" : "outline"} className="h-7 active:scale-[0.98]" onClick={() => setM(x.id)}>{x.rotulo}</Button>
        ))}
      </div>
      {serie.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem métricas diárias gravadas desta campanha no período. Use Atualizar em Publicidade.</p>
      ) : (
        <div className="h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--grid))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tickFormatter={v => v.slice(5).split('-').reverse().join('/')} tick={{ fontSize: 12, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" minTickGap={40} interval="preserveStartEnd" height={36} padding={{ left: 12, right: 12 }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" width={76} tickCount={4} tickFormatter={(v) => m === "conjunto" ? brlCurto(v) : def.fmt(v)} />
              <Tooltip labelFormatter={v => String(v).split('-').reverse().join('/')} formatter={(v: number, name: string) => [def.fmt(v), name]} />
              <Legend iconType="plainline" />
              {m === "conjunto" ? <>
                <Line name="Vendas atribuídas a Ads" type="monotone" dataKey="vendas" stroke="hsl(var(--panel-positive))" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                <Line name="Investimento" type="monotone" dataKey="investimento" stroke="hsl(var(--panel-text-secondary))" strokeDasharray="5 3" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              </> : <Line name={def.rotulo} type="monotone" dataKey={m} stroke="hsl(var(--panel-positive))" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {m === "tacos" && <p className="text-xs text-muted-foreground">TACOS do dia = investimento da campanha ÷ faturamento da loja no mesmo dia (últimos 30 dias lidos do ML).</p>}
    </div>
  );
}
