import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles, X, Info, AlertCircle } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, ZAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCrescimentoMensal, type PontoMensal } from "@/hooks/useCrescimentoMensal";
import { forecastHibrido, inclinacaoLog, classificarTendencia, type SerieMensal } from "@/lib/forecast";
import { decompor, type ContribuicaoCrescimento } from "@/lib/decomposicao";
import { classificarCrescimento } from "@/lib/sustentabilidade";
import { insightCrescimento, insightConversao, insightSazonalidade, insightSustentabilidade } from "@/lib/insightsCrescimento";
import { monthLabel } from "@/lib/dates";

/* ---------- formatters ---------- */
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: v >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v || 0);
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR", { notation: v >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(v || 0);

/* ---------- KPI mini-card ---------- */
function KpiCard({
  titulo, valor, delta, sub, sparkline, severidade = "neutro", chip,
}: {
  titulo: string; valor: string; delta?: number; sub?: string; sparkline?: number[];
  severidade?: "neutro" | "positivo" | "atencao" | "critico" | "info"; chip?: { label: string; color: string };
}) {
  const border = {
    neutro: "hsl(var(--border))", positivo: "#16A34A", atencao: "#F59E0B", critico: "#DC2626", info: "#3B82F6",
  }[severidade];
  const sparkColor = severidade === "critico" ? "#DC2626" : severidade === "atencao" ? "#F59E0B" : severidade === "positivo" ? "#16A34A" : "#3B82F6";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: border }}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <div className="flex items-end justify-between gap-2 mt-2">
        <p className="text-2xl font-semibold tabular-nums leading-none">{valor}</p>
        {sparkline && sparkline.length > 1 && (
          <div className="w-[72px] h-[28px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {delta != null && (
        <div className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium rounded-full px-2 py-0.5 ${
          delta > 0.1 ? "bg-green-500/15 text-green-500" : delta < -0.1 ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground"
        }`}>
          {delta > 0.1 ? <TrendingUp className="w-3 h-3" /> : delta < -0.1 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {fmtPct(delta)}
        </div>
      )}
      {chip && (
        <span className="inline-flex items-center gap-1 mt-2 ml-2 text-[11px] font-medium rounded-full px-2 py-0.5"
          style={{ background: `${chip.color}20`, color: chip.color }}>{chip.label}</span>
      )}
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

/* ---------- Onboarding popover (não-bloqueante, ancorado ao botão) ---------- */
function OnboardingButton() {
  const KEY = "feature_onboarded_projecao_v1";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (localStorage.getItem(KEY) !== "1") {
      // abre automaticamente a primeira vez, mas como popover lateral (não bloqueia)
      setOpen(true);
    }
  }, []);
  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); setStep(0); };
  const steps = [
    { titulo: "Forecast híbrido", texto: "Combina 4 técnicas (regressão, EWMA, CAGR, Holt-Winters) com pesos automáticos por backtest. Linha pontilhada = projeção; banda = IC 95%." },
    { titulo: "Decomposição", texto: "Toda variação de receita é dividida em 3 drivers: visitas, conversão e ticket médio." },
    { titulo: "Sustentabilidade", texto: "Classifica o crescimento como saudável, dependente de tráfego, dependente de ads ou em risco." },
  ];
  const s = steps[step];
  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) close(); else setOpen(true); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Info className="w-3.5 h-3.5" /> Como funciona
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">PASSO {step + 1} DE 3</span>
        </div>
        <h3 className="text-sm font-semibold">{s.titulo}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.texto}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => <span key={i} className={`h-1 w-5 rounded-full ${i === step ? "bg-[#3B82F6]" : "bg-muted"}`} />)}
          </div>
          <div className="flex gap-1">
            {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Voltar</Button>}
            {step < 2
              ? <Button size="sm" onClick={() => setStep(step + 1)}>Próximo</Button>
              : <Button size="sm" onClick={close}>Concluir</Button>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Page ---------- */
export default function ProjecaoCrescimento() {
  const { data, isLoading } = useCrescimentoMensal();
  const [horizonte, setHorizonte] = useState<number>(3);
  const [alpha, setAlpha] = useState<number>(0.4);
  const [showIC, setShowIC] = useState<boolean>(true);
  const [compararCom, setCompararCom] = useState<"1m" | "3m" | "12m">("3m");

  const pontos = data?.pontos ?? [];

  const fc = useMemo(() => data ? forecastHibrido(data.receita, horizonte, alpha) : null, [data, horizonte, alpha]);
  const slope = useMemo(() => data ? inclinacaoLog(data.receita, 6) : 0, [data]);
  const tendencia = classificarTendencia(slope);

  const decomp: ContribuicaoCrescimento = useMemo(() => {
    if (!data || pontos.length < 4) return { total_pct: 0, visitas_pct: 0, cr_pct: 0, aov_pct: 0, interacao_pct: 0 };
    const lastN = compararCom === "1m" ? 1 : compararCom === "3m" ? 3 : 12;
    const cur = pontos[pontos.length - 1];
    const prev = pontos[Math.max(0, pontos.length - 1 - lastN)];
    return decompor(
      { receita: cur.receita, visitas: cur.visitas, cr: cur.cr, aov: cur.aov },
      { receita: prev.receita, visitas: prev.visitas, cr: prev.cr, aov: prev.aov },
    );
  }, [data, pontos, compararCom]);

  const sust = useMemo(() => {
    if (!data) return null;
    return classificarCrescimento({
      receita: data.receita, visitas: data.visitas, cr: data.cr, aov: data.aov, invAds: data.invAds, decomp,
    });
  }, [data, decomp]);

  /* KPI computations */
  const kpis = useMemo(() => {
    if (!data || pontos.length < 2) return null;
    const last = pontos[pontos.length - 1];
    const prev = pontos[pontos.length - 2];
    const last3 = pontos.slice(-3).reduce((s, p) => s + p.receita, 0);
    const prev3 = pontos.slice(-6, -3).reduce((s, p) => s + p.receita, 0);
    const fcSum3 = (fc?.pontos ?? []).slice(0, 3).reduce((s, p) => s + p.valor, 0);
    const projDelta = last3 > 0 ? ((fcSum3 - last3) / last3) * 100 : 0;

    const mom = prev.receita > 0 ? ((last.receita - prev.receita) / prev.receita) * 100 : 0;
    let cagr = 0;
    if (pontos.length >= 12) {
      const f = pontos[pontos.length - 12].receita;
      const l = last.receita;
      if (f > 0 && l > 0) cagr = (Math.pow(l / f, 1 / 11) - 1) * 100;
    }
    const yoy = pontos.length >= 13 && pontos[pontos.length - 13].receita > 0
      ? ((last.receita - pontos[pontos.length - 13].receita) / pontos[pontos.length - 13].receita) * 100
      : null;

    const crDelta = pontos.length >= 4 ? last.cr - pontos[pontos.length - 4].cr : 0;
    const aovDelta = prev.aov > 0 ? ((last.aov - prev.aov) / prev.aov) * 100 : 0;

    return { last, prev, fcSum3, projDelta, mom, cagr, yoy, crDelta, aovDelta };
  }, [data, pontos, fc]);

  /* Chart 1: real + forecast */
  const linhaTemporal = useMemo(() => {
    const real = pontos.map((p) => ({ mes: p.mes, real: p.receita, forecast: null as number | null, lower: null as number | null, upper: null as number | null }));
    const fcRows = (fc?.pontos ?? []).map((p) => ({ mes: p.mes, real: null as number | null, forecast: p.valor, lower: p.lower, upper: p.upper }));
    return [...real, ...fcRows];
  }, [pontos, fc]);

  /* Chart 2: CR vs Visitas */
  const chartCR = pontos.map((p) => ({ mes: p.mes, cr: p.cr, visitas: p.visitas }));

  /* Chart 3: heatmap (only with 24+ months) */
  const heatmap = useMemo(() => {
    if (pontos.length < 24) return null;
    const byYear: Record<string, number[]> = {};
    pontos.forEach((p) => {
      const [y, m] = p.mes.split("-");
      if (!byYear[y]) byYear[y] = new Array(12).fill(0);
      byYear[y][parseInt(m, 10) - 1] = p.receita;
    });
    return byYear;
  }, [pontos]);

  /* Chart 4: scatter — last month per cust (we don't have per-seller here; show one bubble per month) */
  const scatter = pontos.map((p) => ({ x: Math.max(1, p.visitas), y: Math.max(1, p.receita), z: p.cr, label: monthLabel(p.mes) }));

  /* Chart 5: decomposição empilhada por mês */
  const decompMensal = useMemo(() => {
    const out: Array<{ mes: string; visitas: number; cr: number; aov: number; total: number }> = [];
    for (let i = 1; i < pontos.length; i++) {
      const cur = pontos[i], prev = pontos[i - 1];
      const d = decompor(
        { receita: cur.receita, visitas: cur.visitas, cr: cur.cr, aov: cur.aov },
        { receita: prev.receita, visitas: prev.visitas, cr: prev.cr, aov: prev.aov },
      );
      out.push({ mes: cur.mes, visitas: d.visitas_pct, cr: d.cr_pct, aov: d.aov_pct, total: d.total_pct });
    }
    return out;
  }, [pontos]);

  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/")}>← Dashboard</Button>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/gestao-carteira")}>Carteira GM</Button>
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/cpp")}>CPP</Button>
        </div>
      </div>

      <Onboarding />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6" style={{ color: "#1F4E79" }} />
            <div>
              <h1 className="text-2xl font-bold">Projeção de Crescimento e Tendência</h1>
              <p className="text-xs text-muted-foreground">Para onde a carteira vai • por quê • é sustentável?</p>
            </div>
          </div>
          {/* Filtros locais */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Horizonte</span>
              <Select value={String(horizonte)} onValueChange={(v) => setHorizonte(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Comparar</span>
              <Select value={compararCom} onValueChange={(v) => setCompararCom(v as any)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Mês anterior</SelectItem>
                  <SelectItem value="3m">3 meses atrás</SelectItem>
                  <SelectItem value="12m">12 meses atrás</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-44">
              <span className="text-xs text-muted-foreground">α {alpha.toFixed(2)}</span>
              <Slider value={[alpha]} onValueChange={(v) => setAlpha(v[0])} min={0.1} max={0.7} step={0.05} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showIC} onCheckedChange={setShowIC} />
              <span className="text-xs text-muted-foreground">IC95</span>
            </div>
          </div>
        </div>

        {/* Sustentabilidade banner */}
        {sust && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 border-l-4 bg-card shadow-sm"
            style={{ borderLeftColor: sust.cor }}>
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: sust.cor }} />
              <div>
                <Badge variant="outline" className="text-xs" style={{ borderColor: sust.cor, color: sust.cor }}>{sust.classificacao}</Badge>
                <p className="text-sm mt-2 text-foreground">{sust.frase}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* KPI cards */}
        {isLoading || !kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              titulo={`Receita Projetada (${horizonte}m)`}
              valor={fmtBRL(kpis.fcSum3)}
              delta={kpis.projDelta}
              sparkline={[...pontos.slice(-12).map((p) => p.receita), ...(fc?.pontos ?? []).map((p) => p.valor)]}
              severidade={kpis.projDelta > 5 ? "positivo" : kpis.projDelta < -5 ? "atencao" : "info"}
            />
            <KpiCard
              titulo="Crescimento Projetado"
              valor={fmtPct(kpis.mom)}
              sub={`CAGR 12m: ${fmtPct(kpis.cagr)} • YoY: ${kpis.yoy != null ? fmtPct(kpis.yoy) : "—"}`}
              sparkline={pontos.slice(-12).map((p) => p.receita)}
              severidade={kpis.mom > 0 ? "positivo" : "atencao"}
            />
            <KpiCard
              titulo="Taxa de Conversão"
              valor={`${kpis.last.cr.toFixed(2)}%`}
              sub={`Δ ${kpis.crDelta >= 0 ? "+" : ""}${kpis.crDelta.toFixed(2)}pp (3m)`}
              sparkline={pontos.slice(-12).map((p) => p.cr)}
              severidade={kpis.crDelta >= 0 ? "positivo" : "atencao"}
              chip={{
                label: slope > 0.02 ? "↗ Acelerando" : slope < -0.02 ? "↘ Desacelerando" : "→ Estável",
                color: slope > 0.02 ? "#16A34A" : slope < -0.02 ? "#DC2626" : "#6B7280",
              }}
            />
            <KpiCard
              titulo="Ticket Médio (AOV)"
              valor={fmtBRL(kpis.last.aov)}
              delta={kpis.aovDelta}
              sub={`Contribuição AOV: ${decomp.aov_pct >= 0 ? "+" : ""}${decomp.aov_pct.toFixed(1)}pp`}
              sparkline={pontos.slice(-12).map((p) => p.aov)}
              severidade={kpis.aovDelta >= 0 ? "positivo" : "atencao"}
            />
            <KpiCard
              titulo="Tendência (6m)"
              valor={tendencia.rotulo}
              sub={`slope log = ${slope.toFixed(3)}`}
              sparkline={pontos.slice(-6).map((p) => p.receita)}
              chip={{ label: `${(slope * 100).toFixed(1)}%/m`, color: tendencia.cor }}
              severidade={slope >= 0.02 ? "positivo" : slope >= -0.01 ? "neutro" : "atencao"}
            />
          </div>
        )}

        {/* Decomposição barra */}
        <Card className="p-5 rounded-2xl">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold">Decomposição do crescimento ({compararCom})</h3>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: decomp.total_pct >= 0 ? "#16A34A" : "#DC2626" }}>{fmtPct(decomp.total_pct)}</span>
          </div>
          <div className="flex h-8 rounded-md overflow-hidden bg-muted">
            {(() => {
              const total = Math.abs(decomp.visitas_pct) + Math.abs(decomp.cr_pct) + Math.abs(decomp.aov_pct);
              if (total === 0) return null;
              const seg = (v: number, color: string, label: string) => {
                const w = (Math.abs(v) / total) * 100;
                if (w < 0.5) return null;
                return (
                  <div key={label} style={{ width: `${w}%`, background: color }} className="flex items-center justify-center text-[10px] text-white font-semibold">
                    {w > 8 ? `${label}: ${v >= 0 ? "+" : ""}${v.toFixed(1)}pp` : ""}
                  </div>
                );
              };
              return [
                seg(decomp.visitas_pct, "#1F4E79", "Visitas"),
                seg(decomp.cr_pct, "#3B82F6", "CR"),
                seg(decomp.aov_pct, "#D4AF37", "AOV"),
              ];
            })()}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{insightCrescimento(data?.receita ?? [], decomp)}</p>
        </Card>

        {/* Chart 1: real + forecast */}
        <Card className="p-5 rounded-2xl">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold">Receita real + projeção ({horizonte}m)</h3>
            <span className="text-[11px] text-muted-foreground">{fc?.diagnostico}</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={linhaTemporal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={(k) => monthLabel(k)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
                <RTooltip formatter={(v: any) => (v == null ? "—" : fmtBRL(Number(v)))} labelFormatter={(k) => monthLabel(String(k))} />
                {showIC && <Area type="monotone" dataKey="upper" stroke="none" fill="#3B82F6" fillOpacity={0.15} />}
                {showIC && <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />}
                <Line type="monotone" dataKey="real" stroke="#1F4E79" strokeWidth={2.5} dot={false} name="Real" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#3B82F6" strokeDasharray="5 4" strokeWidth={2.5} dot={{ r: 3 }} name="Projeção" connectNulls={false} />
                <ReferenceLine x={pontos[pontos.length - 1]?.mes} stroke="#D4AF37" strokeDasharray="2 2" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: CR vs visitas */}
        <Card className="p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Tendência da Conversão vs Visitas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartCR}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={(k) => monthLabel(k)} />
                <YAxis yAxisId="cr" orientation="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <YAxis yAxisId="v" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
                <RTooltip labelFormatter={(k) => monthLabel(String(k))} />
                <Bar yAxisId="v" dataKey="visitas" fill="hsl(var(--muted))" opacity={0.5} name="Visitas" />
                <Line yAxisId="cr" type="monotone" dataKey="cr" stroke="#D4AF37" strokeWidth={2.5} dot={{ r: 3 }} name="CR (%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{insightConversao(data?.cr ?? [])}</p>
        </Card>

        {/* Chart 3: heatmap sazonalidade */}
        <Card className="p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Sazonalidade (mês × ano, z-score)</h3>
          {heatmap ? (
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full">
                <thead>
                  <tr><th className="text-left p-1">Mês</th>{Object.keys(heatmap).map((y) => <th key={y} className="p-1">{y}</th>)}</tr>
                </thead>
                <tbody>
                  {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((mn, i) => (
                    <tr key={mn}>
                      <td className="p-1 text-muted-foreground">{mn}</td>
                      {Object.keys(heatmap).map((y) => {
                        const arr = heatmap[y];
                        const valid = arr.filter((v) => v > 0);
                        const m = valid.reduce((s, v) => s + v, 0) / (valid.length || 1);
                        const sd = Math.sqrt(valid.reduce((s, v) => s + (v - m) ** 2, 0) / (valid.length || 1)) || 1;
                        const z = arr[i] > 0 ? (arr[i] - m) / sd : 0;
                        const intensity = Math.min(1, Math.abs(z) / 2);
                        const color = z > 0 ? `rgba(34,197,94,${intensity})` : z < 0 ? `rgba(239,68,68,${intensity})` : "transparent";
                        return <td key={y} className="p-2 text-center" style={{ background: color }}>{arr[i] > 0 ? z.toFixed(1) : "—"}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">{insightSazonalidade(data?.receita ?? [])}</p>
          )}
        </Card>

        {/* Chart 4: scatter visitas x receita */}
        <Card className="p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Visitas × Receita (escala log)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" name="Visitas" scale="log" domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
                <YAxis dataKey="y" name="Receita" scale="log" domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
                <ZAxis dataKey="z" range={[40, 240]} name="CR%" />
                <RTooltip formatter={(v: any, n: any) => (n === "Receita" ? fmtBRL(Number(v)) : fmtNum(Number(v)))} />
                <Scatter data={scatter} fill={sust?.cor ?? "#3B82F6"} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 5: decomposição empilhada */}
        <Card className="p-5 rounded-2xl">
          <h3 className="text-sm font-semibold mb-3">Decomposição mensal do crescimento</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={decompMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={(k) => monthLabel(k)} />
                <YAxis yAxisId="pp" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}pp`} />
                <YAxis yAxisId="t" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <RTooltip labelFormatter={(k) => monthLabel(String(k))} formatter={(v: any) => `${Number(v).toFixed(1)}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="pp" dataKey="visitas" stackId="d" fill="#1F4E79" name="Visitas (pp)" />
                <Bar yAxisId="pp" dataKey="cr" stackId="d" fill="#3B82F6" name="CR (pp)" />
                <Bar yAxisId="pp" dataKey="aov" stackId="d" fill="#D4AF37" name="AOV (pp)" />
                <Line yAxisId="t" type="monotone" dataKey="total" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} name="Total %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {sust && <p className="text-xs text-muted-foreground mt-3">{insightSustentabilidade(sust, decomp)}</p>}
        </Card>
      </div>
    </div>
  );
}