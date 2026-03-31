import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Upload, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, TrendingUp, Users, BarChart3, ArrowLeft, CalendarIcon, ShoppingCart, Eye, Percent } from "lucide-react";
import { aggregateSellers, computePeriodComparison, type ConsolidatedSeller, type CppRow, type DailyRoasPoint } from "@/utils/cppAggregation";
import { useNavigate } from "react-router-dom";
import CppActionCards from "@/components/dashboard/CppActionCards";
import CppReputationAlert from "@/components/dashboard/CppReputationAlert";
import CppRoasChart from "@/components/dashboard/CppRoasChart";
import CppClusterPills from "@/components/dashboard/CppClusterPills";
import CppSellerDetail from "@/components/dashboard/CppSellerDetail";
import CppVerticalAnalysis from "@/components/dashboard/CppVerticalAnalysis";
import CppCdpPanel from "@/components/dashboard/CppCdpPanel";
import CppCdpSellerBreakdown from "@/components/dashboard/CppCdpSellerBreakdown";
import CppVerticalTab from "@/components/dashboard/CppVerticalTab";
import CppCategoryChart from "@/components/dashboard/CppCategoryChart";

function fmtCurrency(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtCurrencyFull(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(decimals)}%`;
}
function fmtRoas(v: number | null): string {
  if (v === null || v === undefined) return "N/A";
  return v.toFixed(2);
}
function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return Math.round(v).toLocaleString("pt-BR");
}
function fmtCompact(v: number | null): string {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmtCurrency(v);
}

function priorityBadge(score: number | null) {
  if (score === null || score === undefined) return <Badge variant="outline" className="text-[10px]">—</Badge>;
  const n = Number(score);
  if (n <= 33) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">{n}</Badge>;
  if (n <= 66) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">{n}</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">{n}</Badge>;
}

type SortDir = "asc" | "desc" | null;
interface SortState { col: string; dir: SortDir }

const TABLE_COLS: { key: string; label: string; fmt: (v: any) => string; align?: string; custom?: boolean }[] = [
  { key: "SCORE_PRIORIDADE", label: "Score", fmt: fmtNum, align: "center", custom: true },
  { key: "CUS_NICKNAME", label: "Seller", fmt: String },
  { key: "GRUPO_ACAO", label: "Grupo", fmt: String },
  { key: "SUB_CLUSTER_SELLER", label: "Cluster", fmt: String },
  { key: "INICIATIVA", label: "Iniciativa", fmt: String },
  { key: "PARCEIRO", label: "Parceiro", fmt: String },
  { key: "TGMV_LC", label: "TGMV (R$)", fmt: fmtCurrency, align: "right" },
  { key: "GMV_LC", label: "GMV (R$)", fmt: fmtCurrency, align: "right" },
  { key: "TSI", label: "TSI", fmt: fmtNum, align: "right" },
  { key: "INV_PADS", label: "Inv. Ads (R$)", fmt: fmtCurrency, align: "right" },
  { key: "TGMV_LC_PADS", label: "TGMV Ads (R$)", fmt: fmtCurrency, align: "right" },
  { key: "ROAS", label: "ROAS", fmt: fmtRoas, align: "right" },
  { key: "F_TGMV_LC", label: "Full (R$)", fmt: fmtCurrency, align: "right" },
  { key: "SHARE_FULL", label: "Share Full %", fmt: (v: any) => fmtPct(v), align: "right" },
  { key: "VISITAS", label: "Visitas", fmt: fmtNum, align: "right" },
  { key: "TX_CONVERSAO", label: "Tx Conv.", fmt: (v: any) => fmtPct(v != null ? v * 100 : null), align: "right" },
  { key: "GMV_POR_VISITA", label: "GMV/Visita", fmt: fmtCurrencyFull, align: "right" },
  { key: "TOTAL_LIVELISTINGS", label: "Listings", fmt: fmtNum, align: "right" },
  { key: "GMV_POR_LISTING", label: "GMV/Listing", fmt: fmtCurrencyFull, align: "right" },
  { key: "CDP_TGMV_LC", label: "CDP TGMV", fmt: fmtCurrency, align: "right" },
  { key: "SHARE_CDP", label: "Share CDP %", fmt: (v: any) => fmtPct(v), align: "right" },
  { key: "INVESTIMENTO_PERC_GMV", label: "Inv % GMV", fmt: (v: any) => fmtPct(v), align: "right" },
  { key: "ROAS_CDP", label: "ROAS CDP", fmt: fmtRoas, align: "right" },
  { key: "TGMV_LC_FLEX", label: "Flex (R$)", fmt: fmtCurrency, align: "right" },
  { key: "TSI_FULL", label: "TSI Full", fmt: fmtNum, align: "right" },
  { key: "MESES_NO_PROGRAMA", label: "Meses Prog.", fmt: fmtNum, align: "right" },
];

const INICIATIVA_OPTIONS = ["Todas", "CONSULTORIA", "HUNTING"];

export default function CppDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConsolidatedSeller[]>([]);
  const [rawRows, setRawRows] = useState<CppRow[]>([]);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [dailyRoas, setDailyRoas] = useState<DailyRoasPoint[]>([]);
  const [dowBenchmark, setDowBenchmark] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [search, setSearch] = useState("");
  const [cluster, setCluster] = useState("Todos");
  const [iniciativa, setIniciativa] = useState("Todas");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>({ col: "SCORE_PRIORIDADE", dir: "desc" });
  const [selectedSeller, setSelectedSeller] = useState<ConsolidatedSeller | null>(null);
  const [detailStartDate, setDetailStartDate] = useState<Date>(new Date("2026-03-16T12:00:00"));
  const [detailEndDate, setDetailEndDate] = useState<Date>(new Date("2026-03-22T12:00:00"));

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setFileName(file.name);

    Papa.parse(file, {
      delimiter: ";",
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rows = results.data as CppRow[];
        const result = aggregateSellers(rows);
        setData(result.sellers);
        setRawRows(result.rawRows);
        setDateRange(result.dateRange);
        setDailyRoas(result.dailyRoas);
        setDowBenchmark(result.dowBenchmark);
        // Set default date range to last 7 days of data
        if (result.dateRange.max) {
          const maxD = new Date(result.dateRange.max + "T12:00:00");
          const start7 = new Date(maxD.getTime() - 6 * 86400000);
          const minD = new Date(result.dateRange.min + "T12:00:00");
          setDetailEndDate(maxD);
          setDetailStartDate(start7 < minD ? minD : start7);
        }
        setSelectedSeller(null);
        setLoading(false);
      },
      error() { setLoading(false); },
    });
  }, []);

  const filtered = useMemo(() => {
    let rows = data;
    if (cluster !== "Todos") rows = rows.filter(r => String(r.SUB_CLUSTER_SELLER || "").toLowerCase() === cluster.toLowerCase());
    if (iniciativa !== "Todas") rows = rows.filter(r => String(r.INICIATIVA || "").toUpperCase() === iniciativa);
    if (activeGroup) rows = rows.filter(r => String(r.GRUPO_ACAO || "").toUpperCase().includes(activeGroup));
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => String(r.CUS_NICKNAME || "").toLowerCase().includes(q) || String(r.CUS_CUST_ID_SEL || "").includes(q));
    }
    if (sort.col && sort.dir) {
      rows = [...rows].sort((a, b) => {
        const va = a[sort.col] ?? -Infinity;
        const vb = b[sort.col] ?? -Infinity;
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, cluster, iniciativa, search, sort, activeGroup]);

  const portfolioStartStr = useMemo(() => format(detailStartDate, "yyyy-MM-dd"), [detailStartDate]);
  const portfolioEndStr = useMemo(() => format(detailEndDate, "yyyy-MM-dd"), [detailEndDate]);

  const portfolioMetrics = useMemo(() => {
    if (!rawRows.length) return null;
    return computePeriodComparison(rawRows, null, portfolioStartStr, portfolioEndStr);
  }, [rawRows, portfolioStartStr, portfolioEndStr]);

  const totals = useMemo(() => {
    if (portfolioMetrics) {
      const c = portfolioMetrics.current;
      return {
        gmv: c.tgmv, tsi: c.tsi, visitas: c.visitas,
        inv: c.invPads, tgmvPads: c.tgmvPads,
        roas: c.roas, txConversao: c.txConversao,
        sellers: (cluster !== "Todos" || activeGroup ? filtered : data).length,
        deltas: portfolioMetrics.deltas,
      };
    }
    const src = cluster !== "Todos" || activeGroup ? filtered : data;
    const gmv = src.reduce((s, r) => s + (Number(r.TGMV_LC) || 0), 0);
    const inv = src.reduce((s, r) => s + (Number(r.INV_PADS) || 0), 0);
    const tgmvPads = src.reduce((s, r) => s + (Number(r.TGMV_LC_PADS) || 0), 0);
    const tsi = src.reduce((s, r) => s + (Number(r.TSI) || 0), 0);
    const visitas = src.reduce((s, r) => s + (Number(r.VISITAS) || 0), 0);
    const roas = inv > 0 ? tgmvPads / inv : null;
    const txConversao = visitas > 0 ? (tsi / visitas) * 100 : null;
    return { gmv, inv, tgmvPads, roas, tsi, visitas, txConversao, sellers: src.length, deltas: {} as Record<string, number | null> };
  }, [data, filtered, cluster, activeGroup, portfolioMetrics]);

  const toggleSort = (col: string) => {
    setSort(prev => {
      if (prev.col === col) {
        if (prev.dir === "desc") return { col, dir: "asc" };
        if (prev.dir === "asc") return { col: "", dir: null };
        return { col, dir: "desc" };
      }
      return { col, dir: "desc" };
    });
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const cols = TABLE_COLS.map(c => c.key);
    const header = TABLE_COLS.map(c => c.label).join(";");
    const rows = filtered.map(r => cols.map(k => {
      const v = r[k];
      if (v === null || v === undefined) return "";
      return typeof v === "number" ? String(v).replace(".", ",") : String(v);
    }).join(";"));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cpp_consolidado.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const roasColor = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const n = Number(v);
    if (n < 2) return "text-destructive font-semibold";
    if (n > 10) return "text-emerald-400 font-semibold";
    return "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { if (selectedSeller) setSelectedSeller(null); else navigate("/"); }} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {selectedSeller ? "Detalhe do Seller" : "CPP Consolidado por Seller"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {!selectedSeller && (
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Upload className="w-4 h-4" />
                {fileName || "Carregar CSV"}
              </div>
            </label>
          )}
          {data.length > 0 && !selectedSeller && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1" /> Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Seller Detail View */}
      {selectedSeller && !loading && (
        <>
          <CppSellerDetail
            seller={selectedSeller}
            rawRows={rawRows}
            dateRange={dateRange}
            startDate={detailStartDate}
            endDate={detailEndDate}
            onStartChange={setDetailStartDate}
            onEndChange={setDetailEndDate}
            onClose={() => setSelectedSeller(null)}
            middleContent={
              <>
                <CppReputationAlert data={data} selectedSeller={selectedSeller} />
                <CppCategoryChart
                  seller={selectedSeller}
                  rawRows={rawRows}
                  startDate={format(detailStartDate, "yyyy-MM-dd")}
                  endDate={format(detailEndDate, "yyyy-MM-dd")}
                />
                <CppVerticalAnalysis
                  seller={selectedSeller}
                  rawRows={rawRows}
                  startDate={detailStartDate}
                  endDate={detailEndDate}
                />
                <CppCdpSellerBreakdown
                  custId={selectedSeller.CUS_CUST_ID_SEL}
                  rawRows={rawRows}
                  startDate={detailStartDate}
                  endDate={detailEndDate}
                />
              </>
            }
          />
        </>
      )}

      {/* Main Dashboard View */}
      {data.length > 0 && !loading && !selectedSeller && (
        <>
          {/* Reputation Alert */}
          <CppReputationAlert data={data} />

          {/* Action Cards */}
          <CppActionCards data={data} activeGroup={activeGroup} onToggle={setActiveGroup} />

          {/* Period Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Período:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {format(detailStartDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailStartDate}
                  onSelect={(d) => d && setDetailStartDate(d)}
                  disabled={(d) => dateRange.min ? (d < new Date(dateRange.min + "T12:00:00") || d > new Date(dateRange.max + "T12:00:00")) : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">a</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <CalendarIcon className="w-3 h-3" />
                  {format(detailEndDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={detailEndDate}
                  onSelect={(d) => d && setDetailEndDate(d)}
                  disabled={(d) => dateRange.min ? (d < new Date(dateRange.min + "T12:00:00") || d > new Date(dateRange.max + "T12:00:00")) : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {portfolioMetrics && (
              <span className="text-[10px] text-muted-foreground ml-2">
                Δ vs período anterior ({format(new Date(new Date(detailStartDate).getTime() - (Math.round((detailEndDate.getTime() - detailStartDate.getTime()) / 86400000) + 1) * 86400000), "dd/MM")} a {format(new Date(detailStartDate.getTime() - 86400000), "dd/MM")})
              </span>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">GMV Total</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{fmtCompact(totals.gmv)}</p>
                {totals.deltas?.tgmv != null && (
                  <span className={cn("text-[10px] font-semibold", totals.deltas.tgmv >= 0 ? "text-emerald-400" : "text-destructive")}>
                    {totals.deltas.tgmv >= 0 ? "+" : ""}{totals.deltas.tgmv.toFixed(1)}%
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-chart-3" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Unidades (TSI)</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{fmtNum(totals.tsi)}</p>
                {totals.deltas?.tsi != null && (
                  <span className={cn("text-[10px] font-semibold", totals.deltas.tsi >= 0 ? "text-emerald-400" : "text-destructive")}>
                    {totals.deltas.tsi >= 0 ? "+" : ""}{totals.deltas.tsi.toFixed(1)}%
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-chart-4" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Visitas</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{fmtNum(totals.visitas)}</p>
                {totals.deltas?.visitas != null && (
                  <span className={cn("text-[10px] font-semibold", totals.deltas.visitas >= 0 ? "text-emerald-400" : "text-destructive")}>
                    {totals.deltas.visitas >= 0 ? "+" : ""}{totals.deltas.visitas.toFixed(1)}%
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ROAS</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{totals.roas != null ? `${totals.roas.toFixed(1)}x` : "—"}</p>
                {totals.deltas?.roas != null && (
                  <span className={cn("text-[10px] font-semibold", totals.deltas.roas >= 0 ? "text-emerald-400" : "text-destructive")}>
                    {totals.deltas.roas >= 0 ? "+" : ""}{totals.deltas.roas.toFixed(1)}%
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversão</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{totals.txConversao != null ? `${totals.txConversao.toFixed(2)}%` : "—"}</p>
                {totals.deltas?.txConversao != null && (
                  <span className={cn("text-[10px] font-semibold", totals.deltas.txConversao >= 0 ? "text-emerald-400" : "text-destructive")}>
                    {totals.deltas.txConversao >= 0 ? "+" : ""}{totals.deltas.txConversao.toFixed(1)}%
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-chart-3" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sellers Ativos</span>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">{totals.sellers}</p>
              </CardContent>
            </Card>
          </div>

          {/* ROAS Chart */}
          <CppRoasChart dailyRoas={dailyRoas} dowBenchmark={dowBenchmark} />

          {/* Sub-cluster pills + Filters */}
          <div className="space-y-3">
            <CppClusterPills value={cluster} onChange={setCluster} />
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar seller..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={iniciativa} onValueChange={setIniciativa}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Iniciativa" /></SelectTrigger>
                <SelectContent>
                  {INICIATIVA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs">{filtered.length} sellers</Badge>
            </div>
          </div>

          <Tabs defaultValue="sellers" className="space-y-3">
            <TabsList>
              <TabsTrigger value="sellers">Sellers</TabsTrigger>
              <TabsTrigger value="vertical">Vertical & Concorrência</TabsTrigger>
              <TabsTrigger value="cdp">Ação CDP</TabsTrigger>
            </TabsList>

            <TabsContent value="sellers">
              <Card className="bg-card border-border overflow-hidden">
                <div className="overflow-auto max-h-[65vh]">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        {TABLE_COLS.map(col => (
                          <TableHead
                            key={col.key}
                            className={`cursor-pointer select-none whitespace-nowrap hover:text-primary transition-colors ${col.align === "right" || col.align === "center" ? "text-" + col.align : ""}`}
                            onClick={() => toggleSort(col.key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              {sort.col === col.key ? (
                                sort.dir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row, i) => (
                        <TableRow
                          key={row.CUS_CUST_ID_SEL || i}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelectedSeller(row)}
                        >
                          {TABLE_COLS.map(col => (
                            <TableCell
                              key={col.key}
                              className={`whitespace-nowrap font-mono text-xs ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""} ${col.key === "ROAS" ? roasColor(row[col.key]) : ""}`}
                            >
                              {col.key === "SCORE_PRIORIDADE" ? (
                                priorityBadge(row[col.key] as number | null)
                              ) : col.key === "CUS_NICKNAME" ? (
                                <span className="text-primary hover:underline">{String(row[col.key] || "")}</span>
                              ) : (
                                col.fmt(row[col.key])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="vertical">
              <CppVerticalTab data={data} rawRows={rawRows} dateRange={dateRange} />
            </TabsContent>

            <TabsContent value="cdp">
              <CppCdpPanel data={filtered} onSelectSeller={setSelectedSeller} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {!data.length && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-4">
          <Upload className="w-12 h-12 opacity-30" />
          <p className="text-lg">Carregue um CSV da CPP Diarizada para começar</p>
          <p className="text-sm">O arquivo será processado localmente no navegador</p>
        </div>
      )}
    </div>
  );
}
