import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

export interface PontoDiario {
  /** YYYY-MM-DD */
  date: string;
  gmv: number;
}

interface Props {
  pontos: PontoDiario[];
  titulo?: string;
  className?: string;
}

const NAVY = "hsl(var(--brand-navy))";
const BLUE = "hsl(var(--brand-blue))";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const rotuloMes = (k: string) => {
  const [a, m] = k.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
};

const fShort = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 1_000 ? `R$ ${(v / 1_000).toFixed(1)}k`
      : `R$ ${v.toFixed(0)}`;

const fBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fDelta = (v: number) =>
  Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%` : "—";

/** Compara o GMV de dois meses dia a dia (barras = mês base, linha = mês de comparação). */
export default function GmvMesVsMes({ pontos, titulo = "GMV mês vs mês", className = "" }: Props) {
  const porMes = useMemo(() => {
    const m = new Map<string, Map<number, number>>();
    for (const p of pontos) {
      if (!p.date || p.date.length < 10) continue;
      const chave = p.date.slice(0, 7);
      const dia = Number(p.date.slice(8, 10));
      if (!m.has(chave)) m.set(chave, new Map());
      const dd = m.get(chave)!;
      dd.set(dia, (dd.get(dia) || 0) + (Number(p.gmv) || 0));
    }
    return m;
  }, [pontos]);

  const meses = useMemo(() => Array.from(porMes.keys()).sort(), [porMes]);

  const [mesA, setMesA] = useState<string>("");
  const [mesB, setMesB] = useState<string>("");
  const [modo, setModo] = useState<"diario" | "acumulado">("diario");

  useEffect(() => {
    if (!meses.length) return;
    const ultimo = meses[meses.length - 1];
    const [ano, mes] = ultimo.split("-");
    const anoAnterior = `${Number(ano) - 1}-${mes}`;
    const padraoB = meses.includes(anoAnterior)
      ? anoAnterior
      : meses[meses.length - 2] || ultimo;
    setMesA((v) => (v && meses.includes(v) ? v : ultimo));
    setMesB((v) => (v && meses.includes(v) ? v : padraoB));
  }, [meses]);

  const dados = useMemo(() => {
    const a = porMes.get(mesA);
    const b = porMes.get(mesB);
    if (!a && !b) return [];
    const maxDia = Math.max(
      ...Array.from(a?.keys() || [0]),
      ...Array.from(b?.keys() || [0]),
    );
    let accA = 0, accB = 0;
    return Array.from({ length: maxDia }, (_, i) => {
      const dia = i + 1;
      const va = a?.get(dia) ?? null;
      const vb = b?.get(dia) ?? null;
      accA += va ?? 0;
      accB += vb ?? 0;
      return {
        dia: String(dia).padStart(2, "0"),
        base: modo === "acumulado" ? (va === null && accA === 0 ? null : accA) : va,
        comp: modo === "acumulado" ? (vb === null && accB === 0 ? null : accB) : vb,
      };
    });
  }, [porMes, mesA, mesB, modo]);

  const totalA = useMemo(() => Array.from(porMes.get(mesA)?.values() || []).reduce((s, v) => s + v, 0), [porMes, mesA]);
  const totalB = useMemo(() => Array.from(porMes.get(mesB)?.values() || []).reduce((s, v) => s + v, 0), [porMes, mesB]);
  const variacao = totalB ? (totalA - totalB) / Math.abs(totalB) : NaN;

  if (meses.length < 1) {
    return (
      <div className={`rounded-xl border border-border/50 bg-card/60 p-4 ${className}`}>
        <h3 className="text-xs lg:text-[13px] font-semibold mb-2">{titulo}</h3>
        <p className="py-8 text-center text-xs text-muted-foreground">Sem série diária disponível para comparar meses.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border/50 bg-card/60 p-4 lg:p-5 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-xs lg:text-[13px] font-semibold flex items-center gap-1">
          {titulo}
          <TooltipInfo text="Barras = mês base, linha = mês de comparação, alinhados pelo dia do mês. Escolha os meses para ver a variação (YoY quando o mesmo mês do ano anterior existe na base)." />
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mesA} onValueChange={setMesA}>
            <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue placeholder="Mês base" /></SelectTrigger>
            <SelectContent>
              {meses.map((m) => <SelectItem key={m} value={m} className="text-[11px]">{rotuloMes(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">vs</span>
          <Select value={mesB} onValueChange={setMesB}>
            <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue placeholder="Comparar com" /></SelectTrigger>
            <SelectContent>
              {meses.map((m) => <SelectItem key={m} value={m} className="text-[11px]">{rotuloMes(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={modo} onValueChange={(v) => v && setModo(v as any)} size="sm" className="h-7">
            <ToggleGroupItem value="diario" className="text-[10px] px-2 h-6">Diário</ToggleGroupItem>
            <ToggleGroupItem value="acumulado" className="text-[10px] px-2 h-6">Acumulado</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotuloMes(mesA || "")}</div>
          <div className="text-sm font-semibold tabular-nums">{fBRL(totalA)}</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotuloMes(mesB || "")}</div>
          <div className="text-sm font-semibold tabular-nums">{fBRL(totalB)}</div>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Variação</div>
          <div className={`text-sm font-semibold tabular-nums ${!Number.isFinite(variacao) ? "" : variacao >= 0 ? "text-emerald" : "text-destructive"}`}>
            {fDelta(variacao)}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={dados} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={8} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fShort} width={62} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
            labelFormatter={(l) => `Dia ${l}`}
            formatter={(v: any, n: any) => [v == null ? "—" : fBRL(Number(v)), n]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />
          <Bar dataKey="base" name={rotuloMes(mesA || "")} fill={NAVY} opacity={0.85} radius={[3, 3, 0, 0]} />
          <Line dataKey="comp" name={rotuloMes(mesB || "")} stroke={BLUE} strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
