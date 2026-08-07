import { useMemo, useState } from "react";
import {
  format, parseISO, subDays, addDays, startOfDay, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, TrendingUp, TrendingDown, Minus, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, LineChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { DateRange } from "react-day-picker";

/* ────────────────────────────── tipos & config ────────────────────────────── */

type KpiKey = "gmv" | "ads" | "roas" | "visits" | "tsi";
type Modo = "diario" | "acumulado" | "comparar";

const KPI_CONFIG: Record<KpiKey, { label: string; format: "currency" | "number" | "roas"; aditivo: boolean }> = {
  gmv: { label: "GMV", format: "currency", aditivo: true },
  ads: { label: "Ads", format: "currency", aditivo: true },
  roas: { label: "ROAS", format: "roas", aditivo: false },
  visits: { label: "Visitas", format: "number", aditivo: true },
  tsi: { label: "Vendas (TSI)", format: "number", aditivo: true },
};

const COR_SERIE = "hsl(var(--brand-blue))";
const COR_ANTERIOR = "hsl(var(--muted-foreground) / 0.45)";
const COR_MM7 = "hsl(var(--brand-purple))";
const COR_TERCEIRA = "hsl(var(--text-muted))";
const COR_GRID = "hsl(var(--border))";

interface Daily7DPanelProps {
  dailyKpis: SellerKPI[];
  sellerNickname?: string;
}

/* ────────────────────────────── formatação ────────────────────────────── */

const fmtBRLCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const fmtRoas = (v: number) => `${(v || 0).toFixed(2)}x`;

function fmtKpi(v: number | null, formato: "currency" | "number" | "roas", compact = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (formato === "roas") return fmtRoas(v);
  if (formato === "currency") return compact ? fmtBRLCompact(v) : fmtBRL(v);
  return fmtInt(v);
}

const toISO = (d: Date) => format(d, "yyyy-MM-dd");
const ddMM = (iso: string) => format(parseISO(iso), "dd/MM", { locale: ptBR });

function mediana(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Regressão linear simples: retorna a inclinação por dia. */
function inclinacao(pontos: { x: number; y: number }[]): number | null {
  const n = pontos.length;
  if (n < 2) return null;
  const mx = pontos.reduce((s, p) => s + p.x, 0) / n;
  const my = pontos.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pontos) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (!den) return null;
  return num / den;
}

/* ────────────────────────── small multiple (sparkline) ────────────────────────── */

function MiniSerie({ valores, formato }: { valores: (number | null)[]; formato: "currency" | "number" | "roas" }) {
  const largura = 100;
  const altura = 40;
  const validos = valores.filter((v): v is number => v !== null && Number.isFinite(v));
  if (validos.length < 2) {
    return <div className="h-[40px] flex items-end text-[10px] text-muted-foreground">sem série</div>;
  }
  const min = Math.min(...validos);
  const max = Math.max(...validos);
  const span = max - min || 1;
  const dx = valores.length > 1 ? largura / (valores.length - 1) : largura;

  const segmentos: string[] = [];
  let atual: string[] = [];
  valores.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (atual.length > 1) segmentos.push(atual.join(" "));
      atual = [];
      return;
    }
    const x = i * dx;
    const y = altura - 6 - ((v - min) / span) * (altura - 12);
    atual.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (atual.length > 1) segmentos.push(atual.join(" "));

  const ultimoIdx = [...valores].map((v, i) => ({ v, i })).filter((p) => p.v !== null).pop();
  const ultimoValor = ultimoIdx?.v as number | undefined;

  return (
    <div className="flex items-end gap-1.5 mt-2">
      <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" className="h-[40px] flex-1 min-w-0" aria-hidden>
        {segmentos.map((s, i) => (
          <polyline key={i} points={s} fill="none" stroke={COR_SERIE} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {ultimoValor !== undefined && (
        <span className="text-[10px] tnum lnum text-muted-foreground whitespace-nowrap">
          {fmtKpi(ultimoValor, formato, true)}
        </span>
      )}
    </div>
  );
}

function rotuloFinal(texto: string, total: number, cor: string) {
  return (props: any) => {
    if (props.index !== total - 1) return <g />;
    if (props.x === undefined || props.y === undefined || props.value === null) return <g />;
    return (
      <text x={props.x + 6} y={props.y} dy={4} fontSize={10} fill={cor}>
        {texto}
      </text>
    );
  };
}

/* ────────────────────────────── componente ────────────────────────────── */

export function Daily7DPanel({ dailyKpis, sellerNickname }: Daily7DPanelProps) {
  const porData = useMemo(() => {
    const map = new Map<string, SellerKPI>();
    for (const k of dailyKpis || []) {
      const d = String(k.date || "").slice(0, 10);
      if (d) map.set(d, k);
    }
    return map;
  }, [dailyKpis]);

  const datasOrdenadas = useMemo(() => Array.from(porData.keys()).sort(), [porData]);
  const minDate = datasOrdenadas[0] ? parseISO(datasOrdenadas[0]) : undefined;
  const maxDate = datasOrdenadas.length ? parseISO(datasOrdenadas[datasOrdenadas.length - 1]) : undefined;

  const [janela, setJanela] = useState<{ inicio: string; fim: string }>(() => {
    const fim = maxDate ?? new Date();
    return { inicio: toISO(subDays(fim, 6)), fim: toISO(fim) };
  });
  const [kpiAtivo, setKpiAtivo] = useState<KpiKey>("gmv");
  const [modo, setModo] = useState<Modo>("diario");
  const [comparados, setComparados] = useState<KpiKey[]>(["gmv"]);
  const [avisoComparar, setAvisoComparar] = useState<string | null>(null);
  const [mostrarAnterior, setMostrarAnterior] = useState(true);
  const [verDados, setVerDados] = useState(false);

  const valorDe = (iso: string, key: KpiKey): number | null => {
    const k = porData.get(iso);
    if (!k) return null;
    switch (key) {
      case "gmv": return Number(k.gmv) || 0;
      case "ads": return Number(k.adsInvestment) || 0;
      case "roas": return Number(k.roas) || 0;
      case "visits": return Number(k.visits) || 0;
      case "tsi": return Number(k.tsi) || 0;
    }
  };

  /** todas as datas da janela (inclusive dias sem dado) */
  const datasJanela = useMemo(() => {
    const ini = startOfDay(parseISO(janela.inicio));
    const fim = startOfDay(parseISO(janela.fim));
    const n = Math.max(0, differenceInCalendarDays(fim, ini));
    return Array.from({ length: n + 1 }, (_, i) => toISO(addDays(ini, i)));
  }, [janela]);

  const datasAnteriores = useMemo(() => {
    const len = datasJanela.length;
    const fimAnt = subDays(parseISO(janela.inicio), 1);
    return Array.from({ length: len }, (_, i) => toISO(subDays(fimAnt, len - 1 - i)));
  }, [datasJanela, janela.inicio]);

  const diasComDados = datasJanela.filter((d) => porData.has(d)).length;
  const diasSemDados = datasJanela.length - diasComDados;

  const cfg = KPI_CONFIG[kpiAtivo];

  /** série principal + anterior + MM7 (MM7 usa histórico real anterior à janela) */
  const serie = useMemo(() => {
    const base = datasJanela.map((d, i) => ({
      date: d,
      dateAnt: datasAnteriores[i],
      valor: valorDe(d, kpiAtivo),
      anterior: valorDe(datasAnteriores[i], kpiAtivo),
    }));
    const comMM7 = base.map((p, i) => {
      const janela7 = base.slice(Math.max(0, i - 6), i + 1)
        .map((x) => x.valor).filter((v): v is number => v !== null);
      const mm7 = i >= 6 && janela7.length >= 4
        ? janela7.reduce((s, v) => s + v, 0) / janela7.length
        : null;
      return { ...p, mm7 };
    });
    return comMM7;
  }, [datasJanela, datasAnteriores, kpiAtivo, porData]);

  const valoresValidos = serie.map((p) => p.valor).filter((v): v is number => v !== null);
  const medianaJanela = mediana(valoresValidos);
  const limiteOutlier = medianaJanela * 3;

  /** tendência: regressão sobre a MM7, normalizada em % semanal */
  const tendencia = useMemo(() => {
    if (diasComDados < 14) return null;
    const pts = serie
      .map((p, i) => ({ x: i, y: p.mm7 }))
      .filter((p): p is { x: number; y: number } => p.y !== null && Number.isFinite(p.y));
    const slope = inclinacao(pts);
    if (slope === null) return null;
    const media = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    if (!media) return null;
    return (slope / media) * 100 * 7;
  }, [serie, diasComDados]);

  /** acumulado */
  const acumulado = useMemo(() => {
    let soma = 0;
    return serie.map((p) => {
      if (p.valor !== null) soma += p.valor;
      return { date: p.date, acumulado: soma };
    });
  }, [serie]);

  const totalAcumulado = acumulado.length ? acumulado[acumulado.length - 1].acumulado : 0;

  /** comparação em índice base 100 */
  const dadosComparacao = useMemo(() => {
    const bases: Partial<Record<KpiKey, number>> = {};
    comparados.forEach((k) => {
      const primeiro = datasJanela.map((d) => valorDe(d, k)).find((v) => v !== null && v !== 0);
      bases[k] = primeiro ?? 0;
    });
    return datasJanela.map((d) => {
      const ponto: Record<string, any> = { date: d };
      comparados.forEach((k) => {
        const v = valorDe(d, k);
        const base = bases[k] || 0;
        ponto[k] = v === null || !base ? null : (v / base) * 100;
      });
      return ponto;
    });
  }, [datasJanela, comparados, porData]);

  const yFmt = (v: number) =>
    cfg.format === "currency" ? fmtBRLCompact(v) :
    cfg.format === "roas" ? `${v.toFixed(1)}x` :
    new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v);

  function toggleComparado(k: KpiKey) {
    setAvisoComparar(null);
    if (comparados.includes(k)) {
      if (comparados.length === 1) return;
      setComparados(comparados.filter((x) => x !== k));
      return;
    }
    if (comparados.length >= 3) {
      setAvisoComparar("Máximo de 3 séries em índice base 100. Remova uma para adicionar outra.");
      return;
    }
    setComparados([...comparados, k]);
  }

  if (datasOrdenadas.length === 0) return null;

  const estilosComparacao: Array<{ cor: string; dash?: string }> = [
    { cor: COR_SERIE },
    { cor: COR_MM7, dash: "6 3" },
    { cor: COR_TERCEIRA, dash: "2 3" },
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              KPIs Diários
              {sellerNickname && (
                <Badge variant="secondary" className="text-[10px] font-normal">{sellerNickname}</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 tnum lnum">
              {ddMM(janela.inicio)} → {ddMM(janela.fim)} · {diasComDados} {diasComDados === 1 ? "dia" : "dias"} com dados
              {diasSemDados > 0 && ` · ${diasSemDados} sem dado`}
            </p>
          </div>
          <JanelaPicker
            janela={janela}
            onChange={setJanela}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Small multiples */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(KPI_CONFIG) as KpiKey[]).map((key) => {
            const c = KPI_CONFIG[key];
            const valores = datasJanela.map((d) => valorDe(d, key));
            const validos = valores.filter((v): v is number => v !== null);
            const total = c.aditivo
              ? validos.reduce((s, v) => s + v, 0)
              : validos.length ? validos.reduce((s, v) => s + v, 0) / validos.length : 0;
            const ativo = kpiAtivo === key;
            return (
              <button
                key={key}
                onClick={() => setKpiAtivo(key)}
                aria-pressed={ativo}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  ativo
                    ? "border-[hsl(var(--brand-blue))]"
                    : "bg-card/40 border-border/40 hover:bg-card/60",
                )}
                style={ativo ? { background: "hsl(var(--brand-blue) / 0.12)" } : undefined}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>{c.label}</span>
                  {!c.aditivo && <span className="normal-case tracking-normal text-[9px]">· média</span>}
                </div>
                <div className="text-base font-semibold tnum lnum mt-1 text-foreground">
                  {fmtKpi(total, c.format, true)}
                </div>
                <MiniSerie valores={valores} formato={c.format} />
              </button>
            );
          })}
        </div>

        {/* Controles do gráfico grande */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            value={modo}
            onValueChange={(v) => v && setModo(v as Modo)}
            size="sm"
          >
            <ToggleGroupItem value="diario" className="text-[11px] h-7 px-2.5">Diário</ToggleGroupItem>
            <ToggleGroupItem value="acumulado" className="text-[11px] h-7 px-2.5">Acumulado</ToggleGroupItem>
            <ToggleGroupItem value="comparar" className="text-[11px] h-7 px-2.5">Comparar KPIs</ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-3">
            {modo === "diario" && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarAnterior}
                  onChange={(e) => setMostrarAnterior(e.target.checked)}
                  className="accent-[hsl(var(--brand-blue))]"
                />
                Período anterior
              </label>
            )}
            <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5" onClick={() => setVerDados((v) => !v)}>
              <Table2 className="w-3.5 h-3.5" />
              {verDados ? "Ocultar dados" : "Ver dados"}
            </Button>
          </div>
        </div>

        {/* Bloco de tendência */}
        {modo !== "comparar" && (
          <div className="flex justify-end">
            <TooltipProvider delayDuration={200}>
              <UiTooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-right cursor-help">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-end gap-1">
                      Tendência
                      <span className="rounded border border-border px-1 text-[8px] uppercase text-muted-foreground">der.</span>
                    </div>
                    {tendencia === null ? (
                      <>
                        <div className="text-sm font-semibold tnum lnum text-foreground">—</div>
                        <div className="text-[10px] text-muted-foreground">dados insuficientes para tendência</div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold tnum lnum text-foreground flex items-center justify-end gap-1.5">
                          {tendencia > 0 ? "+" : ""}
                          {tendencia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% / semana
                          {tendencia > 0.5 ? <TrendingUp className="w-3.5 h-3.5" /> : tendencia < -0.5 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {tendencia > 0.5 ? "subindo" : tendencia < -0.5 ? "caindo" : "estável"}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">base: média móvel de 7 dias</div>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px] text-xs">
                  Derivado — inclinação da regressão linear sobre a média móvel de 7 dias da janela,
                  normalizada em % sobre a média do período e multiplicada por 7 (variação semanal).
                  Requer 14+ dias com dados.
                </TooltipContent>
              </UiTooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Gráfico grande */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {modo === "diario" ? (
              <ComposedChart data={serie} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={COR_GRID} strokeWidth={1} vertical={false} />
                <XAxis dataKey="date" tickFormatter={ddMM} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke={COR_GRID} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={yFmt}
                  width={72}
                  stroke={COR_GRID}
                  domain={cfg.format === "currency" ? [0, "auto"] : ["auto", "auto"]}
                />
                <Tooltip
                  cursor={{ stroke: COR_GRID, strokeWidth: 1 }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload;
                    const outlier = p?.valor !== null && limiteOutlier > 0 && p?.valor > limiteOutlier;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 text-xs space-y-1 shadow-lg tnum lnum">
                        <p className="font-semibold text-foreground">{format(parseISO(label), "dd/MM/yyyy")}</p>
                        <p className="text-foreground">{cfg.label}: {fmtKpi(p?.valor ?? null, cfg.format)}</p>
                        {mostrarAnterior && (
                          <p className="text-muted-foreground">
                            Período anterior ({p?.dateAnt ? ddMM(p.dateAnt) : "—"}): {fmtKpi(p?.anterior ?? null, cfg.format)}
                          </p>
                        )}
                        <p className="text-muted-foreground">Média móvel 7d: {fmtKpi(p?.mm7 ?? null, cfg.format)}</p>
                        {outlier && <p className="text-foreground">⚠︎ possível dia parcial (acima de 3× a mediana da janela)</p>}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {mostrarAnterior && (
                  <Line
                    type="linear"
                    dataKey="anterior"
                    name="Período anterior"
                    label={rotuloFinal("Ant.", serie.length, "hsl(var(--muted-foreground))")}
                    stroke={COR_ANTERIOR}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {diasComDados >= 14 && (
                  <Line
                    type="linear"
                    dataKey="mm7"
                    name="Média móvel 7d"
                    label={rotuloFinal("MM7", serie.length, COR_MM7)}
                    stroke={COR_MM7}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  type="linear"
                  dataKey="valor"
                  name={cfg.label}
                  label={rotuloFinal(cfg.label, serie.length, COR_SERIE)}
                  stroke={COR_SERIE}
                  strokeWidth={2}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    if (cx === undefined || cy === undefined || payload?.valor === null) {
                      return <g key={`d-${index}`} />;
                    }
                    const outlier = limiteOutlier > 0 && payload.valor > limiteOutlier;
                    return (
                      <g key={`d-${index}`}>
                        {outlier && <circle cx={cx} cy={cy} r={9} fill="none" stroke={COR_SERIE} strokeWidth={1.5} />}
                        <circle cx={cx} cy={cy} r={4} fill={COR_SERIE} />
                      </g>
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            ) : modo === "acumulado" ? (
              <ComposedChart data={acumulado} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="acumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--brand-blue))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--brand-blue))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={COR_GRID} strokeWidth={1} vertical={false} />
                <XAxis dataKey="date" tickFormatter={ddMM} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke={COR_GRID} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={yFmt}
                  width={72}
                  stroke={COR_GRID}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  cursor={{ stroke: COR_GRID, strokeWidth: 1 }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-lg tnum lnum">
                        <p className="font-semibold text-foreground">{format(parseISO(label), "dd/MM/yyyy")}</p>
                        <p className="text-foreground">Acumulado: {fmtKpi(payload[0]?.value ?? null, cfg.format)}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="linear"
                  dataKey="acumulado"
                  name={`${cfg.label} acumulado`}
                  stroke={COR_SERIE}
                  strokeWidth={2}
                  fill="url(#acumGrad)"
                  isAnimationActive={false}
                />
              </ComposedChart>
            ) : (
              <LineChart data={dadosComparacao} margin={{ top: 8, right: 64, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={COR_GRID} strokeWidth={1} vertical={false} />
                <XAxis dataKey="date" tickFormatter={ddMM} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke={COR_GRID} />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={72}
                  stroke={COR_GRID}
                  label={{ value: "Índice (base 100)", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <ReferenceLine y={100} stroke={COR_GRID} strokeWidth={1} />
                <Tooltip
                  cursor={{ stroke: COR_GRID, strokeWidth: 1 }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 text-xs space-y-1 shadow-lg tnum lnum">
                        <p className="font-semibold text-foreground">{format(parseISO(label), "dd/MM/yyyy")}</p>
                        {comparados.map((k) => {
                          const v = payload.find((x: any) => x.dataKey === k)?.value;
                          return (
                            <p key={k} className="text-foreground">
                              {KPI_CONFIG[k].label}: {v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} (índice)`}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => KPI_CONFIG[v as KpiKey]?.label ?? v} />
                {comparados.map((k, i) => (
                  <Line
                    key={k}
                    type="linear"
                    dataKey={k}
                    name={k}
                    stroke={estilosComparacao[i].cor}
                    strokeDasharray={estilosComparacao[i].dash}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                    isAnimationActive={false}
                    label={(props: any) => {
                      if (props.index !== dadosComparacao.length - 1) return <g key={`l-${k}-${props.index}`} />;
                      if (props.x === undefined || props.y === undefined) return <g key={`l-${k}-x`} />;
                      return (
                        <text key={`l-${k}`} x={props.x + 6} y={props.y} dy={4} fontSize={10} fill="hsl(var(--muted-foreground))">
                          {KPI_CONFIG[k].label}
                        </text>
                      );
                    }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Rótulos diretos (modo comparar) — codificação secundária obrigatória */}
        {modo === "comparar" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KPI_CONFIG) as KpiKey[]).map((k) => {
                const idx = comparados.indexOf(k);
                const ativo = idx >= 0;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleComparado(k)}
                    className={cn(
                      "text-[11px] rounded-md border px-2 py-1 transition-colors",
                      ativo ? "border-foreground/40 text-foreground" : "border-border/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {ativo && (
                        <svg width="18" height="6" aria-hidden>
                          <line
                            x1="0" y1="3" x2="18" y2="3"
                            stroke={estilosComparacao[idx].cor}
                            strokeWidth={2}
                            strokeDasharray={estilosComparacao[idx].dash}
                          />
                        </svg>
                      )}
                      {KPI_CONFIG[k].label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Eixo em índice base 100 (primeiro dia com dado = 100), não em valor absoluto. Máximo de 3 séries.
            </p>
            {avisoComparar && <p className="text-[11px] text-foreground">{avisoComparar}</p>}
          </div>
        )}

        {/* Número-herói do modo acumulado */}
        {modo === "acumulado" && (
          <div className="rounded-lg border border-border/60 bg-card/40 p-3">
            <p className="text-sm font-semibold tnum lnum text-foreground">
              {fmtKpi(totalAcumulado, cfg.format)} acumulados · meta não definida
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sem meta definida para o período: a linha de ritmo necessário não é exibida.
              Janela de {datasJanela.length} dias, {diasComDados} com dados.
            </p>
          </div>
        )}

        {/* Tabela alternativa acessível */}
        {verDados && (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-xs tnum lnum">
              <caption className="sr-only">Série diária de {cfg.label}</caption>
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th scope="col" className="text-left px-2 py-1.5 font-medium">Data</th>
                  <th scope="col" className="text-right px-2 py-1.5 font-medium">{cfg.label}</th>
                  <th scope="col" className="text-right px-2 py-1.5 font-medium">Período anterior</th>
                  <th scope="col" className="text-right px-2 py-1.5 font-medium">MM7</th>
                </tr>
              </thead>
              <tbody>
                {serie.map((p) => (
                  <tr key={p.date} className="border-t border-border/40">
                    <td className="px-2 py-1 text-foreground">{format(parseISO(p.date), "dd/MM/yyyy")}</td>
                    <td className="px-2 py-1 text-right text-foreground">{fmtKpi(p.valor, cfg.format)}</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">{fmtKpi(p.anterior, cfg.format)}</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">{fmtKpi(p.mm7, cfg.format)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────── seletor de janela ────────────────────────── */

function JanelaPicker({
  janela,
  onChange,
  minDate,
  maxDate,
}: {
  janela: { inicio: string; fim: string };
  onChange: (j: { inicio: string; fim: string }) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const hoje = maxDate ?? new Date();

  const presets = [
    { label: "Últ. 7 dias", dias: 7 },
    { label: "Últ. 14 dias", dias: 14 },
    { label: "Últ. 30 dias", dias: 30 },
    { label: "Últ. 90 dias", dias: 90 },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 px-3 text-xs gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          <span className="tnum lnum">{ddMM(janela.inicio)} → {ddMM(janela.fim)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3 space-y-3" align="end">
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onChange({ inicio: toISO(subDays(hoje, p.dias - 1)), fim: toISO(hoje) });
                setOpen(false);
              }}
              className="text-[11px] rounded-md px-2 py-1.5 text-left border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="pt-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground mb-1">Ou intervalo personalizado:</div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            defaultMonth={maxDate}
            locale={ptBR}
            className="p-0 pointer-events-auto"
          />
          {range?.from && range?.to && (
            <Button
              size="sm"
              className="w-full mt-2 h-8 text-xs"
              onClick={() => {
                onChange({ inicio: toISO(range.from!), fim: toISO(range.to!) });
                setRange(undefined);
                setOpen(false);
              }}
            >
              Aplicar {format(range.from, "dd/MM")} → {format(range.to, "dd/MM")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
