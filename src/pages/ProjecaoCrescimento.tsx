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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCrescimentoMensal, type PontoMensal } from "@/hooks/useCrescimentoMensal";
import { useClassificacaoLojas } from "@/hooks/useClassificacaoLojas";
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
  const { data: lojas, isLoading: loadingLojas } = useClassificacaoLojas();
  const [filtroClass, setFiltroClass] = useState<string>("all");
  const [horizonte, setHorizonte] = useState<number>(3);
  const [alpha, setAlpha] = useState<number>(0.4);
  const [showIC, setShowIC] = useState<boolean>(true);
  const [compararCom, setCompararCom] = useState<"1m" | "3m" | "12m">("3m");

  const pontos = data?.pontos ?? [];
  const poucosDados = !isLoading && pontos.length < 4;
  const semDados = !isLoading && pontos.length === 0;

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
            <OnboardingButton />
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

        {/* Empty state global */}
        {semDados && (
          <Card className="p-8 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" />
            <h3 className="text-sm font-semibold">Sem dados mensais disponíveis</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Não encontramos histórico mensal para a carteira atual. Faça o upload de KPIs em Admin → Uploads ou ajuste o filtro de carteira.
            </p>
          </Card>
        )}

        {/* Sustentabilidade banner — só com histórico mínimo de 4 meses */}
        {sust && !poucosDados && !semDados && (
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

        {poucosDados && (
          <Card className="p-4 rounded-2xl border-l-4" style={{ borderLeftColor: "#F59E0B" }}>
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 mt-0.5 text-[#F59E0B]" />
              <div>
                <p className="text-sm font-medium">Histórico curto: {pontos.length} {pontos.length === 1 ? "mês" : "meses"}</p>
                <p className="text-xs text-muted-foreground">Projeções e classificações ficam disponíveis a partir de 4 meses de histórico.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Classificação por loja (tier + diagnóstico + argumentos) */}
        {!semDados && (
          <Card className="p-5 rounded-2xl">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold">Classificação por loja</h3>
                <p className="text-[11px] text-muted-foreground">Tier (cluster), diagnóstico de sustentabilidade e drivers que justificam — últimos 3 meses.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Filtrar</span>
                <Select value={filtroClass} onValueChange={setFiltroClass}>
                  <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Array.from(new Set((lojas ?? []).map((l) => l.classificacao))).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {loadingLojas ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div>
            ) : !lojas || lojas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma loja com 4+ meses de histórico para classificar.</p>
            ) : (
              <TooltipProvider delayDuration={150}>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/50">
                      <th className="px-2 py-2 font-medium">Loja</th>
                      <th className="px-2 py-2 font-medium">Tier / Cluster</th>
                      <th className="px-2 py-2 font-medium">Classificação</th>
                      <th className="px-2 py-2 font-medium text-right">ΔReceita 3m</th>
                      <th className="px-2 py-2 font-medium text-right">ΔVisitas 3m</th>
                      <th className="px-2 py-2 font-medium text-right">ΔCR 3m</th>
                      <th className="px-2 py-2 font-medium text-right">ΔAOV 3m</th>
                      <th className="px-2 py-2 font-medium text-right">Slope 6m</th>
                      <th className="px-2 py-2 font-medium">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lojas ?? [])
                      .filter((l) => filtroClass === "all" || l.classificacao === filtroClass)
                      .slice(0, 80)
                      .map((l) => {
                        const a = l.argumentos;
                        const cellPct = (v: number, isPp = false, explica: string) => {
                          const c = v > 1 ? "#16A34A" : v < -1 ? "#DC2626" : "hsl(var(--muted-foreground))";
                          const suf = isPp ? "pp" : "%";
                          return (
                            <td className="px-2 py-2 text-right tabular-nums" style={{ color: c }}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                                    {v >= 0 ? "+" : ""}{v.toFixed(1)}{suf}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                  {explica}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        };
                         const tierColor = l.tier === 1 ? "#E5E4E2" : l.tier === 2 ? "#D4AF37" : "#9CA3AF";
                         const tierName = l.tier === 1 ? "green_platinum" : l.tier === 2 ? "green_gold" : "green_silver";
                         const fonteLabel =
                           l.tierFonte === "reputacao" ? "Reputação atual do MeLi"
                           : l.tierFonte === "metricas" ? "Métricas oficiais (SoW Pads / OOS / BS)"
                           : "Fallback por receita (sem reputação/métricas no DB)";
                         const sym = (s: "ok" | "fail" | "na") => s === "ok" ? "✓" : s === "fail" ? "✗" : "—";
                         const tierExpl = (
                           <div className="space-y-1.5">
                             <div className="font-semibold">Tier {l.tier} — {tierName}</div>
                             <div className="text-[10px] text-muted-foreground">Fonte: {fonteLabel}</div>
                             <div className="border-t border-border/40 pt-1.5 space-y-0.5">
                               <div>{sym(l.tierChecks.rep)} Reputação: <b>{l.repLevel ?? "n/d"}</b></div>
                               <div>{sym(l.tierChecks.sowPads)} %SoW Pads: <b>{l.metricas.sowPadsPct.toFixed(2)}%</b> (alvo ≥ {l.tier === 1 ? "2.5" : l.tier === 2 ? "1.25" : "0.5"}%)</div>
                               <div>{sym(l.tierChecks.oos)} %OOS: <b>{l.tierChecks.oos === "na" ? "n/d" : `${l.metricas.oosPct.toFixed(1)}%`}</b> (alvo ≤ {l.tier === 1 ? "15" : l.tier === 2 ? "25" : "35"}%)</div>
                               <div>{sym(l.tierChecks.bs)} %BS: <b>{l.tierChecks.bs === "na" ? "n/d" : `${l.metricas.bsPct.toFixed(2)}%`}</b> (alvo ≤ {l.tier === 1 ? "35" : l.tier === 2 ? "45" : "55"}%)</div>
                             </div>
                           </div>
                         );
                        const classExpl = (() => {
                          const r = a.receitaPct3m, v = a.visitasPct3m, cr = a.crPp3m, ads = a.invAdsPct3m, sl = a.slope6m;
                          if (r <= -15 || sl <= -0.05) return `Risco de retração: receita ${r.toFixed(0)}% (≤ -15%) ou slope ${(sl*100).toFixed(1)}%/m (≤ -5%/m).`;
                          if (ads > 30 && r <= ads) return `Artificial/ads-driven: ads +${ads.toFixed(0)}% > receita ${r.toFixed(0)}%.`;
                          if (cr <= -5) return `Conversão em queda: ΔCR ${cr.toFixed(1)}pp (≤ -5pp).`;
                          if (v > 10 && cr <= -2) return `Dependente de tráfego: visitas +${v.toFixed(0)}% mas CR ${cr.toFixed(1)}pp.`;
                          if (r > 25 && ads < r) return `Escalabilidade positiva: receita +${r.toFixed(0)}% > ads +${ads.toFixed(0)}%.`;
                          if (Math.abs(v) < 5 && cr > 2) return `Eficiência operacional: CR +${cr.toFixed(1)}pp sem mais tráfego (Δvisitas ${v.toFixed(1)}%).`;
                          if (v > 0 && cr > 0 && a.aovPct3m >= 0) return "Saudável: visitas, CR e AOV crescendo juntos.";
                          if (r < -3) return `Drivers misturados (receita ${r.toFixed(1)}%) — investigar visitas, CR e AOV.`;
                          return "Sem gatilhos críticos — crescimento estável.";
                        })();
                        return (
                          <tr key={l.sellerId} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="px-2 py-2">
                              <div className="font-medium text-foreground truncate max-w-[180px]">{l.nickname}</div>
                              <div className="text-[10px] text-muted-foreground">{l.custId}</div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help">
                                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: tierColor, color: tierColor }}>
                                        T{l.tier}
                                      </Badge>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">{tierExpl}</TooltipContent>
                                </Tooltip>
                                <Badge variant="outline" className="text-[10px]">{l.cluster}</Badge>
                              </div>
                              {l.subCluster && l.subCluster !== "—" && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">{l.subCluster}</div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help">
                                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: l.cor, color: l.cor }}>
                                      {l.classificacao}
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{classExpl}</TooltipContent>
                              </Tooltip>
                            </td>
                            {cellPct(a.receitaPct3m, false, `Variação % da receita comparando o último mês com 3 meses atrás. Verde > +1%, vermelho < -1%. Drivers: ΔVisitas ${a.visitasPct3m.toFixed(1)}%, ΔCR ${a.crPp3m.toFixed(1)}pp, ΔAOV ${a.aovPct3m.toFixed(1)}%.`)}
                            {cellPct(a.visitasPct3m, false, `Variação % de visitas em 3m. Se +>10% com CR caindo ≥ 2pp → "Dependente de tráfego".`)}
                            {cellPct(a.crPp3m, true, `Variação em pontos percentuais da Taxa de Conversão (TSI/Visitas). ≤ -5pp → "Conversão em queda"; ≤ -2pp combinado com slope < 0 → "Risco de retração".`)}
                            {cellPct(a.aovPct3m, false, `Variação % do Ticket Médio (Receita/TSI). AOV em alta com visitas estáveis sustenta receita sem mais tráfego.`)}
                            {cellPct(a.slope6m * 100, false, `Inclinação da regressão log da receita nos últimos 6 meses, em %/mês. ≤ -5%/m ou ≥ +5%/m disparam classificações extremas (Risco / Aceleração).`)}
                            <td className="px-2 py-2 text-muted-foreground max-w-[320px]">{l.frase}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {lojas.length > 80 && (
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">Mostrando 80 de {lojas.length} lojas — use o filtro para refinar.</p>
                )}
              </div>
              </TooltipProvider>
            )}
          </Card>
        )}

        {/* Glossário de KPIs — minimalista */}
        {!semDados && (
          <Card className="p-5 rounded-2xl">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Glossário</h3>
                <p className="text-[11px] text-muted-foreground">Definição curta de cada KPI usado nesta página.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {[
                { grupo: "Tier (Marketplace)", items: [
                  { k: "Tier 1 — green_platinum", v: "%SoW Pads ≥ 2,5 · %OOS ≤ 15 · %BS ≤ 35 · %3PGM ≥ 60" },
                  { k: "Tier 2 — green_gold", v: "%SoW Pads ≥ 1,25 · %OOS ≤ 25 · %BS ≤ 45 · %3PGM ≥ 45" },
                  { k: "Tier 3 — green_silver", v: "%SoW Pads ≥ 0,5 · %OOS ≤ 35 · %BS ≤ 55 · %3PGM ≥ 20" },
                ]},
                { grupo: "Métricas oficiais", items: [
                  { k: "%3PGM", v: "Penetração em 3 Pilares (Garantia, Mensagens, Marca). Origem: cpp_mensal." },
                  { k: "%SoW Pads", v: "Share of Wallet em Ads = inv_pads ÷ TGMV_LC (proxy do investimento publicitário sobre receita)." },
                  { k: "%OOS", v: "Out of Stock = 100 − ll_stock_availability_score (rupturas no catálogo ativo)." },
                  { k: "%BS", v: "Bad Seller — proxy via rep_cancellations_rate (cancelamentos sob responsabilidade do vendedor)." },
                  { k: "Reputação (rep_current_level)", v: "Nível oficial do MeLi: green_platinum / green_gold / green_silver." },
                ]},
                { grupo: "Drivers de receita", items: [
                  { k: "Receita (TGMV_LC)", v: "GMV transacional do período em moeda local." },
                  { k: "Visitas", v: "Sessões nos anúncios do vendedor." },
                  { k: "TSI", v: "Total de itens vendidos (unidades)." },
                  { k: "CR (Conversão)", v: "TSI ÷ Visitas × 100. Variação medida em pontos percentuais (pp)." },
                  { k: "AOV (Ticket Médio)", v: "Receita ÷ TSI." },
                  { k: "INV PADS", v: "Investimento em Product Ads no período." },
                ]},
                { grupo: "Crescimento e tendência", items: [
                  { k: "ΔReceita 3m", v: "Variação % da receita: último mês vs. 3 meses atrás." },
                  { k: "Slope 6m", v: "Inclinação da regressão log da receita nos últimos 6 meses (%/mês)." },
                  { k: "CAGR 12m", v: "Taxa composta de crescimento anualizada com base em 12 meses." },
                  { k: "YoY", v: "Variação contra o mesmo mês do ano anterior." },
                  { k: "Decomposição (pp)", v: "Δlog Receita ≈ Δlog Visitas + Δlog CR + Δlog AOV — cada driver em pp do total." },
                ]},
                { grupo: "Forecast", items: [
                  { k: "Forecast híbrido", v: "Média ponderada de Regressão linear, EWMA, CAGR e Holt-Winters." },
                  { k: "α (alpha)", v: "Suavização exponencial do EWMA — maior α dá mais peso ao recente." },
                  { k: "IC95", v: "Banda de incerteza ±1,96 desvios da projeção." },
                ]},
                { grupo: "Sustentabilidade do crescimento", items: [
                  { k: "Saudável", v: "Visitas, CR e AOV crescendo juntos." },
                  { k: "Eficiência operacional", v: "CR sobe (>+2pp) sem precisar de mais tráfego." },
                  { k: "Escalabilidade positiva", v: "Receita +>25% e ads crescendo menos que receita." },
                  { k: "Dependente de tráfego", v: "Visitas +>10% mas CR cai ≥ 2pp." },
                  { k: "Conversão em queda", v: "ΔCR ≤ −5pp em 3 meses." },
                  { k: "Artificial / ads-driven", v: "Ads +>30% e receita ≤ ads (CAC/LTV em alerta)." },
                  { k: "Risco de retração", v: "Receita ≤ −15% em 3m ou slope ≤ −5%/m." },
                ]},
              ].map((bloco) => (
                <div key={bloco.grupo} className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{bloco.grupo}</p>
                  <dl className="space-y-1">
                    {bloco.items.map((it) => (
                      <div key={it.k} className="text-[11px] leading-relaxed">
                        <dt className="font-medium text-foreground inline">{it.k} — </dt>
                        <dd className="text-muted-foreground inline">{it.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Card>
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
                <RTooltip
                  formatter={(v: any, name: any) => {
                    if (v == null) return ["—", name];
                    const labels: Record<string, string> = { real: "Real", forecast: "Projeção", upper: "IC95 sup.", lower: "IC95 inf." };
                    return [fmtBRL(Number(v)), labels[String(name)] ?? name];
                  }}
                  labelFormatter={(k) => monthLabel(String(k))}
                />
                {showIC && <Area type="monotone" dataKey="upper" stroke="none" fill="#3B82F6" fillOpacity={0.15} />}
                {showIC && <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />}
                <Line type="monotone" dataKey="real" stroke="#1F4E79" strokeWidth={2.5} dot={false} name="Real" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#3B82F6" strokeDasharray="5 4" strokeWidth={2.5} dot={{ r: 3 }} name="Projeção" connectNulls={false} />
                <ReferenceLine x={pontos[pontos.length - 1]?.mes} stroke="#D4AF37" strokeDasharray="2 2" label={{ value: "hoje", position: "top", fill: "#D4AF37", fontSize: 10 }} />
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
                <RTooltip
                  labelFormatter={(k) => monthLabel(String(k))}
                  formatter={(v: any, name: any) => {
                    if (name === "CR (%)") return [`${Number(v).toFixed(2)}%`, name];
                    if (name === "Visitas") return [fmtNum(Number(v)), name];
                    return [String(v), name];
                  }}
                />
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
                <RTooltip
                  labelFormatter={(k) => monthLabel(String(k))}
                  formatter={(v: any, name: any) => {
                    const suf = String(name).includes("Total") ? "%" : "pp";
                    const n = Number(v);
                    return [`${n >= 0 ? "+" : ""}${n.toFixed(1)}${suf}`, name];
                  }}
                />
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