import { linhaCsvSegura } from "@/lib/csvSafe";
import { useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell, ReferenceLine, ComposedChart, ZAxis,
} from "recharts";
import { type KpiId } from "./KpiCard";
import { abrirSellerNoMeli } from "@/lib/sellerLink";
import type { MesAgg, SellerCarteira } from "@/lib/insights";
import {
  insightTGMV, insightSellersAtivos, insightTicketMedio,
  insightQueda, insightCrescimento, insightVencimento,
} from "@/lib/insights";

// ── Formatters ──
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const mesLabel = (m: number) => `${String(m).slice(4)}/${String(m).slice(0, 4)}`;

const TT_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 };

// ── Interfaces ──
export interface CppRow {
  cus_cust_id_sel: number;
  tim_month_id: number;
  cus_nickname: string;
  cluster_seller: string;
  nivel_solucion: string;
  tgmv_lc: number;
  fecha_in?: string;
  meses_no_programa: number;
}

export interface PmRow {
  cust_id: number;
  nmv_lc: number;
  nmv_lc_1: number;
  nmv_lc_2: number;
  vs_pm_pct: number;
  dias_expiracao: number;
  data_expiracao_concessao?: string;
  seller_url?: string;
}

export interface EnrichedSeller {
  cust_id: number;
  cus_nickname: string;
  tgmv_lc: number;
  vs_pm_pct: number;
  dias_expiracao: number;
  cluster_seller: string;
  nivel_solucion: string;
  nmv_lc: number;
  nmv_lc_1: number;
  nmv_lc_2: number;
  seller_url?: string;
  alerts: { tipo: string; cor: string; pulsante?: boolean }[];
}

interface Props {
  kpiId: KpiId;
  onClose: () => void;
  cppData: CppRow[];
  pmData: PmRow[];
  filteredSellers: EnrichedSeller[];
  months: number[];
  activeMonth: number;
  setDrawerSeller: (s: any) => void;
}

// ── Component ──
export default function KpiDetailPanel({
  kpiId, onClose, cppData, pmData, filteredSellers, months, activeMonth, setDrawerSeller,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [kpiId]);

  // ── Aggregate 12-month series ──
  const serie12m = useMemo<MesAgg[]>(() => {
    const last12 = months.slice(0, 12).reverse();
    return last12.map((m) => {
      const rows = cppData.filter((r) => r.tim_month_id === m);
      const ativos = rows.filter((r) => (r.tgmv_lc ?? 0) > 0);
      const total = ativos.reduce((s, r) => s + (r.tgmv_lc ?? 0), 0);
      return {
        mes: m,
        tgmv_total: total,
        count_ativos: ativos.length,
        ticket: ativos.length > 0 ? total / ativos.length : 0,
        count_queda: 0,
        count_crescimento: 0,
      };
    });
  }, [cppData, months]);

  // ── Sellers with prev month TGMV ──
  const sellersPrevMap = useMemo(() => {
    const prevMonth = months[1] ?? 0;
    const prevRows = cppData.filter((r) => r.tim_month_id === prevMonth);
    const map = new Map<number, number>();
    prevRows.forEach((r) => map.set(r.cus_cust_id_sel, r.tgmv_lc ?? 0));
    return map;
  }, [cppData, months]);

  const sellersWithDelta = useMemo(() =>
    filteredSellers.map((s) => ({
      ...s,
      tgmv_lc_prev: sellersPrevMap.get(s.cust_id) ?? 0,
      delta_rs: (s.tgmv_lc ?? 0) - (sellersPrevMap.get(s.cust_id) ?? 0),
    })),
    [filteredSellers, sellersPrevMap]
  );

  const sellersEmQueda = useMemo(() =>
    sellersWithDelta
      .filter((s) => s.alerts.some((a) => a.tipo === "QUEDA_3M" || a.tipo === "QUEDA_MOM" || a.tipo === "CRITICO"))
      .map((s) => ({ ...s, perda: Math.max(s.tgmv_lc_prev - s.tgmv_lc, 0) }))
      .sort((a, b) => b.perda - a.perda),
    [sellersWithDelta]
  );

  const sellersEmCrescimento = useMemo(() =>
    sellersWithDelta
      .filter((s) => s.delta_rs > 0 && s.alerts.some((a) => a.tipo === "CRESCIMENTO_3M" || a.tipo === "CRESCIMENTO_MOM"))
      .sort((a, b) => b.delta_rs - a.delta_rs),
    [sellersWithDelta]
  );

  const sellersVencimento = useMemo(() =>
    filteredSellers
      .filter((s) => s.dias_expiracao <= 60)
      .sort((a, b) => a.dias_expiracao - b.dias_expiracao),
    [filteredSellers]
  );

  // CSV export for current chart
  const handleExportCsv = useCallback(() => {
    let headers: string[] = [];
    let rows: string[][] = [];
    switch (kpiId) {
      case "tgmv":
        headers = ["Mês", "TGMV"];
        rows = serie12m.map((m) => [mesLabel(m.mes), m.tgmv_total.toFixed(2)]);
        break;
      case "sellers_ativos":
        headers = ["Mês", "Ativos", "Ticket"];
        rows = serie12m.map((m) => [mesLabel(m.mes), String(m.count_ativos), m.ticket.toFixed(2)]);
        break;
      case "queda":
        headers = ["Nickname", "Cluster", "Δ R$", "Δ %", "Dias Exp."];
        rows = sellersEmQueda.slice(0, 50).map((s) => [s.cus_nickname, s.cluster_seller, s.perda.toFixed(2), s.vs_pm_pct.toFixed(1), String(s.dias_expiracao)]);
        break;
      case "crescimento":
        headers = ["Nickname", "Cluster", "Δ R$", "Δ %"];
        rows = sellersEmCrescimento.slice(0, 50).map((s) => [s.cus_nickname, s.cluster_seller, s.delta_rs.toFixed(2), s.vs_pm_pct.toFixed(1)]);
        break;
      case "vencimento":
        headers = ["Nickname", "TGMV", "Dias Exp."];
        rows = sellersVencimento.map((s) => [s.cus_nickname, s.tgmv_lc.toFixed(2), String(s.dias_expiracao)]);
        break;
      default:
        headers = ["Nickname", "TGMV"];
        rows = filteredSellers.slice(0, 100).map((s) => [s.cus_nickname, s.tgmv_lc.toFixed(2)]);
    }
    const csv = [linhaCsvSegura(headers, ","), ...rows.map((r) => linhaCsvSegura(r, ","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `kpi_${kpiId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [kpiId, serie12m, sellersEmQueda, sellersEmCrescimento, sellersVencimento, filteredSellers]);

  // Insight
  const insight = useMemo(() => {
    switch (kpiId) {
      case "tgmv": return insightTGMV(serie12m);
      case "sellers_ativos": return insightSellersAtivos(serie12m);
      case "ticket_medio": return insightTicketMedio(filteredSellers.filter((s) => s.tgmv_lc > 0).map((s) => s.tgmv_lc));
      case "queda": return insightQueda(sellersEmQueda.map((s) => ({ cus_nickname: s.cus_nickname, tgmv_lc: s.tgmv_lc, tgmv_lc_prev: s.tgmv_lc_prev, vs_pm_pct: s.vs_pm_pct, dias_expiracao: s.dias_expiracao })));
      case "crescimento": return insightCrescimento(sellersEmCrescimento.map((s) => ({ cus_nickname: s.cus_nickname, tgmv_lc: s.tgmv_lc, tgmv_lc_prev: s.tgmv_lc_prev, vs_pm_pct: s.vs_pm_pct, dias_expiracao: s.dias_expiracao })));
      case "vencimento": return insightVencimento(sellersVencimento.map((s) => ({ cus_nickname: s.cus_nickname, tgmv_lc: s.tgmv_lc, tgmv_lc_prev: 0, vs_pm_pct: s.vs_pm_pct, dias_expiracao: s.dias_expiracao })));
      default: return "";
    }
  }, [kpiId, serie12m, filteredSellers, sellersEmQueda, sellersEmCrescimento, sellersVencimento]);

  const TITLES: Record<KpiId, string> = {
    tgmv: "Evolução TGMV – 12 meses",
    sellers_ativos: "Sellers Ativos + Ticket Médio",
    ticket_medio: "Distribuição da Carteira",
    queda: "Waterfall de Impacto – Sellers em Queda",
    crescimento: "Oportunidades de Crescimento",
    vencimento: "Timeline de Concessões",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={panelRef}
        key={kpiId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
      >
        <Card>
          <div className="flex items-center justify-between p-4 pb-0">
            <div>
              <h3 className="text-sm font-semibold">{TITLES[kpiId]}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">{insight}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <CardContent className="pt-3">
            <div className="flex gap-4 flex-col lg:flex-row" style={{ minHeight: 420 }}>
              <div className="flex-1 min-w-0" role="figure" aria-label={TITLES[kpiId]}>
                {kpiId === "tgmv" && <TgmvChart data={serie12m} />}
                {kpiId === "sellers_ativos" && <SellersAtivosChart data={serie12m} />}
                {kpiId === "ticket_medio" && <TicketMedioChart sellers={filteredSellers} />}
                {kpiId === "queda" && <QuedaWaterfall sellers={sellersEmQueda} onClickSeller={setDrawerSeller} />}
                {kpiId === "crescimento" && <CrescimentoChart sellers={sellersEmCrescimento} onClickSeller={setDrawerSeller} />}
                {kpiId === "vencimento" && <VencimentoTimeline sellers={sellersVencimento} onClickSeller={setDrawerSeller} />}
              </div>
              <div className="w-full lg:w-[340px] shrink-0 overflow-y-auto max-h-[420px]">
                {kpiId === "tgmv" && <TgmvTable sellers={filteredSellers} />}
                {kpiId === "sellers_ativos" && <AtivosTable sellers={sellersWithDelta} months={months} cppData={cppData} />}
                {kpiId === "ticket_medio" && <ConcentracaoTable sellers={filteredSellers} />}
                {kpiId === "queda" && <QuedaTable sellers={sellersEmQueda} />}
                {kpiId === "crescimento" && <CrescimentoTable sellers={sellersEmCrescimento} />}
                {kpiId === "vencimento" && <VencimentoTable sellers={sellersVencimento} />}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════
// 3.1 TGMV Chart
// ═══════════════════════════════════════
function TgmvChart({ data }: { data: MesAgg[] }) {
  const chartData = useMemo(() => {
    return data.map((m, i) => {
      const slice = data.slice(Math.max(0, i - 2), i + 1);
      const mm3 = slice.reduce((s, x) => s + x.tgmv_total, 0) / slice.length;
      return { mes: mesLabel(m.mes), tgmv: m.tgmv_total, mm3 };
    });
  }, [data]);

  if (chartData.length === 0) return <EmptyState />;

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmtCompact} />
          <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={TT_STYLE} />
          <Area type="monotone" dataKey="tgmv" fill="hsl(217 91% 60% / 0.15)" stroke="hsl(217 91% 60%)" strokeWidth={2} name="TGMV" />
          <Line type="monotone" dataKey="mm3" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 3" dot={false} name="MM 3M" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TgmvTable({ sellers }: { sellers: EnrichedSeller[] }) {
  const top20 = useMemo(() => {
    const sorted = [...sellers].sort((a, b) => b.tgmv_lc - a.tgmv_lc).slice(0, 20);
    const total = sellers.reduce((s, r) => s + r.tgmv_lc, 0);
    return sorted.map((s) => ({ ...s, pctTotal: total > 0 ? (s.tgmv_lc / total) * 100 : 0 }));
  }, [sellers]);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">Top 20 Sellers</p>
      {top20.map((s, i) => (
        <div key={s.cust_id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/30">
          <span className="w-5 text-muted-foreground">{i + 1}.</span>
          <span className="flex-1 truncate font-medium">{s.cus_nickname}</span>
          <span className="tabular-nums text-muted-foreground">{s.pctTotal.toFixed(1)}%</span>
          <span className="tabular-nums">{fmtCompact(s.tgmv_lc)}</span>
          <button onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)} className="text-primary hover:text-blue-400">
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// 3.2 Sellers Ativos
// ═══════════════════════════════════════
function SellersAtivosChart({ data }: { data: MesAgg[] }) {
  if (data.length === 0) return <EmptyState />;
  const chartData = data.map((m) => ({ mes: mesLabel(m.mes), ativos: m.count_ativos, ticket: m.ticket }));
  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" tickFormatter={fmtCompact} />
          <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [name === "ticket" ? fmtBRL(v) : v, name === "ticket" ? "Ticket Médio" : "Ativos"]} />
          <Legend />
          <Bar yAxisId="left" dataKey="ativos" fill="#16A34A" radius={[4, 4, 0, 0]} name="Ativos" />
          <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} name="Ticket Médio" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function AtivosTable({ sellers, months, cppData }: { sellers: any[]; months: number[]; cppData: CppRow[] }) {
  const prevMonth = months[1] ?? 0;
  const curIds = new Set(sellers.filter((s: any) => s.tgmv_lc > 0).map((s: any) => s.cust_id));
  const prevRows = cppData.filter((r) => r.tim_month_id === prevMonth);
  const prevIds = new Set(prevRows.filter((r) => (r.tgmv_lc ?? 0) > 0).map((r) => r.cus_cust_id_sel));

  const novos = sellers.filter((s: any) => curIds.has(s.cust_id) && !prevIds.has(s.cust_id));
  const inativos = cppData
    .filter((r) => r.tim_month_id === prevMonth && (r.tgmv_lc ?? 0) > 0 && !curIds.has(r.cus_cust_id_sel))
    .slice(0, 10);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-green-400 mb-1">Novos ({novos.length})</p>
        {novos.slice(0, 5).map((s: any) => (
          <div key={s.cust_id} className="text-[11px] flex justify-between py-0.5">
            <span className="truncate">{s.cus_nickname}</span>
            <span className="tabular-nums">{fmtCompact(s.tgmv_lc)}</span>
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-red-400 mb-1">Inativaram ({inativos.length})</p>
        {inativos.map((s) => (
          <div key={s.cus_cust_id_sel} className="text-[11px] flex items-center justify-between py-0.5">
            <span className="truncate">{s.cus_nickname}</span>
            <button onClick={() => abrirSellerNoMeli(s.cus_cust_id_sel, s.cus_nickname)} className="text-primary"><ExternalLink className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 3.3 Ticket Médio / Histograma
// ═══════════════════════════════════════
function TicketMedioChart({ sellers }: { sellers: EnrichedSeller[] }) {
  const values = sellers.filter((s) => s.tgmv_lc > 0).map((s) => s.tgmv_lc);
  const bins = useMemo(() => {
    const ranges = [
      { label: "0–1k", min: 0, max: 1000 },
      { label: "1k–10k", min: 1000, max: 10000 },
      { label: "10k–100k", min: 10000, max: 100000 },
      { label: "100k–1M", min: 100000, max: 1000000 },
      { label: ">1M", min: 1000000, max: Infinity },
    ];
    return ranges.map((r) => ({
      ...r,
      count: values.filter((v) => v >= r.min && v < r.max).length,
    }));
  }, [values]);

  const stats = useMemo(() => {
    if (values.length === 0) return { mean: 0, median: 0, p25: 0, p75: 0, p90: 0, gini: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const median = sorted[Math.floor(n / 2)];
    const p25 = sorted[Math.floor(n * 0.25)];
    const p75 = sorted[Math.floor(n * 0.75)];
    const p90 = sorted[Math.floor(n * 0.9)];
    let giniNum = 0;
    for (let i = 0; i < n; i++) giniNum += (2 * (i + 1) - n - 1) * sorted[i];
    const gini = mean > 0 ? giniNum / (n * n * mean) : 0;
    return { mean, median, p25, p75, p90, gini };
  }, [values]);

  if (values.length === 0) return <EmptyState />;

  return (
    <div className="h-[400px] flex gap-4">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip contentStyle={TT_STYLE} />
            <Bar dataKey="count" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="Sellers" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="w-[140px] space-y-2 text-[11px]">
        <p className="font-medium text-muted-foreground">Estatísticas</p>
        <div className="space-y-1">
          <Row label="Mediana" value={fmtCompact(stats.median)} />
          <Row label="IQR (p25–p75)" value={`${fmtCompact(stats.p25)}–${fmtCompact(stats.p75)}`} />
          <Row label="Média (assimétrica)" value={fmtCompact(stats.mean)} />
          <Row label="P25" value={fmtCompact(stats.p25)} />
          <Row label="P75" value={fmtCompact(stats.p75)} />
          <Row label="P90" value={fmtCompact(stats.p90)} />
          <Row label="Gini" value={`${(stats.gini * 100).toFixed(0)}%`} />
          <Row label="n" value={String(values.length)} />
        </div>
        <p className="text-[10px] leading-tight text-muted-foreground pt-1">
          Distribuição fortemente assimétrica: a mediana é o valor de referência; a média é puxada pelas maiores lojas.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

function ConcentracaoTable({ sellers }: { sellers: EnrichedSeller[] }) {
  const sorted = useMemo(() => [...sellers].filter((s) => s.tgmv_lc > 0).sort((a, b) => b.tgmv_lc - a.tgmv_lc), [sellers]);
  const total = sorted.reduce((s, r) => s + r.tgmv_lc, 0);
  // Find how many sellers make 80%
  let acc = 0;
  let count80 = 0;
  for (const s of sorted) {
    acc += s.tgmv_lc;
    count80++;
    if (acc >= total * 0.8) break;
  }
  const pct80 = sorted.length > 0 ? ((count80 / sorted.length) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Concentração 80/20</p>
      <p className="text-[11px]">{pct80}% dos sellers concentram 80% do TGMV ({count80} de {sorted.length})</p>
      <div className="space-y-0.5">
        {sorted.slice(0, 10).map((s, i) => (
          <div key={s.cust_id} className="flex items-center gap-1 text-[11px] py-0.5">
            <span className="w-4 text-muted-foreground">{i + 1}.</span>
            <span className="flex-1 truncate">{s.cus_nickname}</span>
            <span className="tabular-nums">{fmtCompact(s.tgmv_lc)}</span>
            <button onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)} className="text-primary"><ExternalLink className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 3.4 Queda Waterfall
// ═══════════════════════════════════════
function QuedaWaterfall({ sellers, onClickSeller }: { sellers: any[]; onClickSeller: (s: any) => void }) {
  const top20 = sellers.slice(0, 20);
  if (top20.length === 0) return <EmptyState msg="Nenhum seller em queda neste filtro 🎉" />;

  const data = top20.map((s) => ({
    name: s.cus_nickname,
    perda: s.perda,
    pct: s.vs_pm_pct,
    fill: s.alerts.some((a: any) => a.tipo === "CRITICO") ? "#7F1D1D" : s.alerts.some((a: any) => a.tipo === "QUEDA_3M") ? "#DC2626" : "#F97316",
    seller: s,
  }));

  return (
    <div className="h-[400px] overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 90, right: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" tickFormatter={fmtCompact} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={TT_STYLE} />
          <Bar dataKey="perda" radius={[0, 4, 4, 0]} name="Perda R$" cursor="pointer" onClick={(d: any) => d?.seller && onClickSeller(d.seller)}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuedaTable({ sellers }: { sellers: any[] }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground mb-2">Ranking de Perda</p>
      {sellers.slice(0, 20).map((s, i) => (
        <div key={s.cust_id} className="flex items-center gap-1 text-[11px] py-1 border-b border-border/30">
          <span className="w-5 text-muted-foreground">{i + 1}.</span>
          <span className="flex-1 truncate font-medium">{s.cus_nickname}</span>
          <span className="tabular-nums text-red-400">-{fmtCompact(s.perda)}</span>
          <span className="tabular-nums text-muted-foreground w-12 text-right">{fmtPct(s.vs_pm_pct)}</span>
          <span className="tabular-nums text-muted-foreground w-8 text-right">{s.dias_expiracao}d</span>
          <button onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)} className="text-primary"><ExternalLink className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// 3.5 Crescimento
// ═══════════════════════════════════════
function CrescimentoChart({ sellers, onClickSeller }: { sellers: any[]; onClickSeller: (s: any) => void }) {
  const top20 = sellers.slice(0, 20);
  if (top20.length === 0) return <EmptyState msg="Nenhum seller em crescimento neste filtro." />;

  const data = top20.map((s) => {
    const deltaPct = s.tgmv_lc_prev > 0 ? ((s.tgmv_lc - s.tgmv_lc_prev) / s.tgmv_lc_prev) * 100 : 0;
    return {
      name: s.cus_nickname,
      delta_rs: s.delta_rs,
      delta_pct: deltaPct,
      fill: deltaPct > 100 ? "#D4AF37" : deltaPct > 50 ? "#16A34A" : "#86EFAC",
      seller: s,
    };
  });

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
          <YAxis yAxisId="left" tickFormatter={fmtCompact} />
          <YAxis yAxisId="right" orientation="right" unit="%" />
          <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [name === "delta_pct" ? `${v.toFixed(1)}%` : fmtBRL(v), name === "delta_pct" ? "Δ %" : "Δ R$"]} />
          <Bar yAxisId="left" dataKey="delta_rs" radius={[4, 4, 0, 0]} name="Δ R$" cursor="pointer" onClick={(d: any) => d?.seller && onClickSeller(d.seller)}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
          <Scatter yAxisId="right" dataKey="delta_pct" fill="#FDE68A" name="Δ %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CrescimentoTable({ sellers }: { sellers: any[] }) {
  const highFlyers = sellers.filter((s) => s.tgmv_lc_prev > 0 && ((s.tgmv_lc - s.tgmv_lc_prev) / s.tgmv_lc_prev) * 100 > 100);
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">High Flyers (Δ% &gt; 100%): {highFlyers.length}</p>
      {highFlyers.slice(0, 15).map((s, i) => {
        const pct = s.tgmv_lc_prev > 0 ? ((s.tgmv_lc - s.tgmv_lc_prev) / s.tgmv_lc_prev) * 100 : 0;
        return (
          <div key={s.cust_id} className="flex items-center gap-1 text-[11px] py-0.5">
            <span className="w-4 text-muted-foreground">{i + 1}.</span>
            <span className="flex-1 truncate">{s.cus_nickname}</span>
            <Badge className="text-[9px] bg-yellow-600/20 text-yellow-400 border-0">+{pct.toFixed(0)}%</Badge>
            <button onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)} className="text-primary"><ExternalLink className="w-3 h-3" /></button>
          </div>
        );
      })}
      {highFlyers.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhum high flyer neste filtro.</p>}
    </div>
  );
}

// ═══════════════════════════════════════
// 3.6 Vencimento Timeline
// ═══════════════════════════════════════
function VencimentoTimeline({ sellers, onClickSeller }: { sellers: any[]; onClickSeller: (s: any) => void }) {
  if (sellers.length === 0) return <EmptyState msg="Nenhuma concessão próxima do vencimento." />;

  const data = sellers.map((s) => ({
    dias: s.dias_expiracao,
    tgmv: s.tgmv_lc,
    name: s.cus_nickname,
    fill: s.dias_expiracao < 0 ? "#7F1D1D" : s.dias_expiracao <= 7 ? "#DC2626" : s.dias_expiracao <= 30 ? "#F97316" : s.dias_expiracao <= 60 ? "#F59E0B" : "#6B7280",
    seller: s,
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" dataKey="dias" name="Dias" label={{ value: "Dias até vencimento", position: "bottom", fontSize: 11 }} />
          <YAxis type="number" dataKey="tgmv" name="TGMV" tickFormatter={fmtCompact} />
          <ZAxis type="number" dataKey="tgmv" range={[40, 400]} />
          <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [name === "TGMV" ? fmtBRL(v) : `${v} dias`, name]} />
          <ReferenceLine x={0} stroke="#DC2626" strokeWidth={2} label={{ value: "Hoje", fill: "#DC2626", fontSize: 10 }} />
          <ReferenceLine x={7} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <ReferenceLine x={30} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <Scatter data={data} cursor="pointer" onClick={(d: any) => d?.seller && onClickSeller(d.seller)}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.8} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function VencimentoTable({ sellers }: { sellers: any[] }) {
  const groups = [
    { label: "Vencido", filter: (s: any) => s.dias_expiracao < 0 },
    { label: "Esta semana", filter: (s: any) => s.dias_expiracao >= 0 && s.dias_expiracao <= 7 },
    { label: "8–30 dias", filter: (s: any) => s.dias_expiracao > 7 && s.dias_expiracao <= 30 },
    { label: "31–60 dias", filter: (s: any) => s.dias_expiracao > 30 && s.dias_expiracao <= 60 },
  ];
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const list = sellers.filter(g.filter);
        if (list.length === 0) return null;
        const tgmvRisco = list.reduce((s: number, r: any) => s + r.tgmv_lc, 0);
        return (
          <div key={g.label}>
            <p className="text-xs font-medium text-muted-foreground">{g.label} ({list.length}) — {fmtCompact(tgmvRisco)}</p>
            {list.slice(0, 5).map((s: any) => (
              <div key={s.cust_id} className="flex items-center gap-1 text-[11px] py-0.5">
                <span className="flex-1 truncate">{s.cus_nickname}</span>
                <span className="tabular-nums">{fmtCompact(s.tgmv_lc)}</span>
                <span className="tabular-nums text-muted-foreground">{s.dias_expiracao}d</span>
                <button onClick={() => abrirSellerNoMeli(s.cust_id, s.cus_nickname)} className="text-primary"><ExternalLink className="w-3 h-3" /></button>
              </div>
            ))}
            {list.length > 5 && <p className="text-[10px] text-muted-foreground">+{list.length - 5} mais...</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Empty State ──
function EmptyState({ msg = "Sem dados para este filtro." }: { msg?: string }) {
  return (
    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
      {msg}
    </div>
  );
}