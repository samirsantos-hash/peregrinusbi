import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { brl, brlCurto, num, pctFracao } from "@/lib/format";

export type LinhaDiaCampanha = {
  campaign_id: number | string;
  dia: string;
  cost: number | null;
  total_amount: number | null;
  clicks: number | null;
  prints: number | null;
  units_quantity: number | null;
};

type Metrica = "investimento" | "vendas" | "roas" | "acos" | "tacos" | "cliques" | "cpc" | "ctr";
const METRICAS: { id: Metrica; rotulo: string; fmt: (v: number | null) => string }[] = [
  { id: "investimento", rotulo: "Investimento", fmt: (v) => brl(v, true) },
  { id: "vendas", rotulo: "Vendas", fmt: (v) => brl(v, true) },
  { id: "roas", rotulo: "ROAS", fmt: (v) => (v == null ? "Sem dado" : `${num(v, 2)}x`) },
  { id: "acos", rotulo: "ACOS", fmt: (v) => pctFracao(v, 1) },
  { id: "tacos", rotulo: "TACOS", fmt: (v) => pctFracao(v, 2) },
  { id: "cliques", rotulo: "Cliques", fmt: (v) => num(v) },
  { id: "cpc", rotulo: "CPC", fmt: (v) => brl(v, true) },
  { id: "ctr", rotulo: "CTR", fmt: (v) => pctFracao(v, 2) },
];

const rz = (a: number, b: number) => (b > 0 ? a / b : null);

/** Evolução diária de uma campanha, uma métrica por vez (linha verde única). */
export default function CampanhaGrafico({ nome, linhas, faturamentoDia, aoFechar }: {
  nome: string;
  linhas: LinhaDiaCampanha[];
  faturamentoDia: { data: string; faturamento: number }[];
  aoFechar: () => void;
}) {
  const [m, setM] = useState<Metrica>("investimento");
  const fat = useMemo(() => new Map(faturamentoDia.map((f) => [f.data.slice(0, 10), f.faturamento])), [faturamentoDia]);
  const serie = useMemo(() => [...linhas].sort((a, b) => a.dia.localeCompare(b.dia)).map((l) => {
    const c = +(l.cost ?? 0), v = +(l.total_amount ?? 0), k = +(l.clicks ?? 0), p = +(l.prints ?? 0);
    const f = fat.get(l.dia);
    return {
      dia: `${l.dia.slice(8, 10)}/${l.dia.slice(5, 7)}`,
      investimento: c, vendas: v, cliques: k,
      roas: rz(v, c), acos: rz(c, v), cpc: rz(c, k), ctr: rz(k, p),
      tacos: f != null && f > 0 ? c / f : null,
    };
  }), [linhas, fat]);
  const def = METRICAS.find((x) => x.id === m) ?? METRICAS[0];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
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
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="gCamp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--ec-verde))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--ec-verde))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--grid))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" minTickGap={40} interval="preserveStartEnd" height={36} padding={{ left: 12, right: 12 }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" width={76} tickCount={4} tickFormatter={(v) => m === "vendas" || m === "investimento" ? brlCurto(v) : def.fmt(v)} />
              <Tooltip formatter={(v: number) => [def.fmt(v), def.rotulo]} />
              <Area type="monotone" dataKey={m} stroke="hsl(var(--ec-verde))" strokeWidth={2} fill="url(#gCamp)" connectNulls={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {m === "tacos" && <p className="text-xs text-muted-foreground">TACOS do dia = investimento da campanha ÷ faturamento da loja no mesmo dia (últimos 30 dias lidos do ML).</p>}
    </div>
  );
}
