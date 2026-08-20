import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea, Label,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TooltipInfo from "@/components/dashboard/TooltipInfo";
import { NovidadeTip } from "@/components/novidades/novidades";
import {
  agruparPorMes, construirSerie, resumirComparacao, diagnosticarJanela, type PontoDiario,
} from "@/lib/gmvMesVsMes";

export type { PontoDiario };

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

const fPct = (v: number) =>
  Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : "—";

/** Compara o GMV de dois meses dia a dia (barras = mês base, linha = mês de comparação). */
export default function GmvMesVsMes({ pontos, titulo = "GMV mês vs mês", className = "" }: Props) {
  const porMes = useMemo(() => agruparPorMes(pontos), [pontos]);

  const meses = useMemo(() => Array.from(porMes.keys()).sort(), [porMes]);

  const [mesA, setMesA] = useState<string>("");
  const [mesB, setMesB] = useState<string>("");
  const [modo, setModo] = useState<"diario" | "acumulado" | "variacao">("diario");

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

  const dados = useMemo(
    () => construirSerie(porMes, mesA, mesB, modo),
    [porMes, mesA, mesB, modo],
  );

  const resumo = useMemo(() => resumirComparacao(porMes, mesA, mesB), [porMes, mesA, mesB]);
  const { totalA, totalB, totalBJanela, ultimoDiaA, parcial, variacao } = resumo;

  const diagnostico = useMemo(() => diagnosticarJanela(porMes, mesA, mesB), [porMes, mesA, mesB]);

  /** Faixa de dias que ainda não ocorreram / sem registro no mês base. */
  const faixaNaoOcorrida = useMemo(() => {
    const naoOcorridos = dados.filter((d) => d.ocorrido === false).map((d) => d.dia);
    if (!naoOcorridos.length) return null;
    return { de: naoOcorridos[0], ate: naoOcorridos[naoOcorridos.length - 1] };
  }, [dados]);

  const dominioVariacao = useMemo<[number, number] | undefined>(() => {
    if (modo !== "variacao") return undefined;
    const vals = dados.map((d) => d.base).filter((v): v is number => Number.isFinite(v as number));
    if (!vals.length) return undefined;
    const max = Math.max(10, ...vals.map((v) => Math.abs(v))) * 1.15;
    return [-max, max];
  }, [dados, modo]);

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
          <TooltipInfo text="Barras = mês base, linha = mês de comparação, alinhados pelo dia do mês. No modo Variação %, cada barra mostra quanto o acumulado do mês base está acima (+) ou abaixo (−) do mesmo dia do mês comparado; a linha tracejada no zero é a referência, não uma série. A faixa hachurada marca dias que ainda não ocorreram." />
          <NovidadeTip id="gmv-mes-vs-mes" className="ml-1" />
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
            <ToggleGroupItem value="variacao" className="text-[10px] px-2 h-6">Variação %</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotuloMes(mesA || "")}</div>
          <div className="text-sm font-semibold tabular-nums">{fBRL(totalA)}</div>
          {parcial && <div className="text-[9px] text-muted-foreground">parcial · até dia {String(ultimoDiaA).padStart(2, "0")}</div>}
        </div>
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotuloMes(mesB || "")}</div>
          <div className="text-sm font-semibold tabular-nums">{fBRL(parcial ? totalBJanela : totalB)}</div>
          {parcial && <div className="text-[9px] text-muted-foreground">mesma janela · mês cheio {fBRL(totalB)}</div>}
        </div>
        <div className="rounded-lg border border-border/40 bg-card/50 p-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Variação{parcial ? " (janela comparável)" : ""}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${!Number.isFinite(variacao) ? "" : variacao >= 0 ? "text-emerald" : "text-destructive"}`}>
            {fDelta(variacao)}
          </div>
          <div
            className={`text-[9px] leading-tight mt-0.5 ${diagnostico.causa === "confirmada" ? "text-muted-foreground" : "text-amber-500"}`}
          >
            {diagnostico.texto}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={dados} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <pattern id="gmvNaoOcorrido" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="hsl(var(--muted))" fillOpacity={0.25} />
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} strokeWidth={1.5} />
            </pattern>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} minTickGap={8} />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={modo === "variacao" ? (v: number) => fPct(v) : fShort}
            width={62}
            domain={dominioVariacao}
          />
          {modo === "variacao" ? (
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload;
                if (!p) return null;
                const pct = p.base as number | null;
                return (
                  <div className="rounded-lg border border-border bg-card p-2.5 text-[11px] space-y-1 min-w-[210px]">
                    <p className="font-semibold text-foreground">Dia {label} · acumulado</p>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{rotuloMes(mesA || "")} (base)</span>
                      <span className="tabular-nums font-medium">{fBRL(p.accA || 0)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{rotuloMes(mesB || "")} (comparado)</span>
                      <span className="tabular-nums font-medium">{fBRL(p.accB || 0)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-border/50 pt-1">
                      <span className="text-muted-foreground">Variação relativa</span>
                      <span
                        className={`tabular-nums font-semibold ${pct == null ? "" : pct >= 0 ? "text-emerald" : "text-destructive"}`}
                      >
                        {pct == null ? "—" : fPct(pct)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              labelFormatter={(l) => `Dia ${l}`}
              formatter={(v: any, n: any) => [v == null ? "—" : fBRL(Number(v)), n]}
            />
          )}
          {modo !== "variacao" && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={9} />}
          {faixaNaoOcorrida && (
            <ReferenceArea
              x1={faixaNaoOcorrida.de}
              x2={faixaNaoOcorrida.ate}
              fill="url(#gmvNaoOcorrido)"
              stroke="none"
              ifOverflow="extendDomain"
            >
              <Label value="não ocorrido" position="insideTop" fill="hsl(var(--muted-foreground))" fontSize={10} />
            </ReferenceArea>
          )}
          {modo === "variacao" && (
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 4">
              <Label
                value={`${rotuloMes(mesB || "")} = base`}
                position="right"
                fill="hsl(var(--muted-foreground))"
                fontSize={10}
              />
            </ReferenceLine>
          )}
          <Bar
            dataKey="base"
            name={modo === "variacao" ? `${rotuloMes(mesA || "")} · variação` : rotuloMes(mesA || "")}
            fill={NAVY}
            opacity={0.85}
            radius={[3, 3, 0, 0]}
          />
          {modo !== "variacao" && (
            <Line
              dataKey="comp"
              name={rotuloMes(mesB || "")}
              stroke={BLUE}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
