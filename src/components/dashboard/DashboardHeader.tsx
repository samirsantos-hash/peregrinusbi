import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, TrendingUp, TrendingDown, Sparkles, Store, Check, ChevronsUpDown, MapPin, Layers, Tag, RefreshCw, CalendarDays, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";
import TooltipInfo from "./TooltipInfo";

/* ------------------------------------------------------------------ */
/*  Helpers — timezone-safe date parsing                               */
/* ------------------------------------------------------------------ */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function subLocalDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
  return result;
}

interface Seller {
  id: string;
  nickname: string;
  custId: string;
  cluster?: string;
  subCluster?: string;
  state?: string;
}

interface KpiLike {
  date?: string;
  gmv: number;
  upliftGmvM1: number;
}

interface DashboardHeaderProps {
  sellers: Seller[];
  selectedSeller: string;
  onSellerChange: (id: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** ALL kpis (unfiltered) — used for anchor date computation */
  allKpis: KpiLike[];
  /** Filtered kpis — used for display metrics */
  filteredKpis: KpiLike[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Notify parent of period key changes (7, 15, 30, all, custom) */
  onPeriodChange?: (period: string) => void;
}

const DashboardHeader = ({
  sellers,
  selectedSeller,
  onSellerChange,
  dateRange,
  onDateRangeChange,
  allKpis,
  filteredKpis,
  onRefresh,
  isRefreshing,
  onPeriodChange,
}: DashboardHeaderProps) => {
  const [calOpen, setCalOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<string>("q1");
  const { playClick } = useSoundFeedback();

  // Anchor date = max date in the FULL (unfiltered) dataset
  const { anchorDate, minDate, availableDays } = useMemo(() => {
    const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort();
    if (dates.length === 0) {
      return { anchorDate: new Date(), minDate: new Date("2020-01-01"), availableDays: 0 };
    }
    const uniqueDates = [...new Set(dates)].sort() as string[];
    const maxStr = uniqueDates[uniqueDates.length - 1];
    const minStr = uniqueDates[0];
    const anchor = parseLocalDate(maxStr);
    const min = parseLocalDate(minStr);
    const days = differenceInDays(anchor, min);
    return { anchorDate: anchor, minDate: min, availableDays: days };
  }, [allKpis]);

  // Warning when selected period exceeds available data
  const periodWarning = useMemo(() => {
    if (activePeriod === "all" || activePeriod === "custom") return null;
    const requestedDays = parseInt(activePeriod);
    if (isNaN(requestedDays)) return null;
    if (availableDays < requestedDays && availableDays > 0) {
      return `Exibindo histórico disponível (${availableDays} dias)`;
    }
    return null;
  }, [activePeriod, availableDays]);

  const selectedSellerObj = sellers.find((s) => s.id === selectedSeller);

  // Calculate actual data span from FILTERED kpis for projection
  const rangeDays = useMemo(() => {
    if (filteredKpis.length === 0) return 30;
    const dates = filteredKpis.map((k: any) => k.date).filter(Boolean);
    if (dates.length === 0) return 30;
    const uniqueDates = [...new Set(dates)].sort() as string[];
    const first = parseLocalDate(uniqueDates[0]);
    const last = parseLocalDate(uniqueDates[uniqueDates.length - 1]);
    const diff = differenceInDays(last, first);
    // For single-day selection, use 1 day instead of forcing 30
    return Math.max(diff, 1);
  }, [filteredKpis]);

  const validUplifts = filteredKpis.filter((k) => k.upliftGmvM1 !== 0);
  const avgUplift = validUplifts.length > 0
    ? validUplifts.reduce((s, k) => s + k.upliftGmvM1, 0) / validUplifts.length
    : 0;
  const clampedUplift = Math.max(-0.5, Math.min(2, avgUplift));
  const totalGmv = filteredKpis.reduce((s, k) => s + k.gmv, 0);
  const dailyGmv = rangeDays > 0 ? totalGmv / rangeDays : 0;

  const projections = [
    { days: 7, value: dailyGmv * 7 * (1 + clampedUplift) },
    { days: 15, value: dailyGmv * 15 * (1 + clampedUplift) },
    { days: 30, value: dailyGmv * 30 * (1 + clampedUplift) },
  ];

  const quickRanges = [
    { label: "Q1", key: "q1", months: [1, 2, 3] },
    { label: "Q2", key: "q2", months: [4, 5, 6] },
    { label: "Q3", key: "q3", months: [7, 8, 9] },
    { label: "Q4", key: "q4", months: [10, 11, 12] },
  ];

  // Determine the latest year from data for quarter filtering
  const latestYear = useMemo(() => {
    const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort();
    if (dates.length === 0) return 2026;
    const maxDate = dates[dates.length - 1] as string;
    return parseInt(maxDate.split("-")[0], 10);
  }, [allKpis]);

  const handleQuickRange = (qr: typeof quickRanges[0]) => {
    playClick();
    setActivePeriod(qr.key);
    onPeriodChange?.(qr.key);
    const year = latestYear;
    const fromMonth = qr.months[0];
    const toMonth = qr.months[qr.months.length - 1];
    const from = new Date(year, fromMonth - 1, 1);
    const to = new Date(year, toMonth, 0); // last day of the quarter's last month
    onDateRangeChange({ from, to });
    setCalOpen(false);
  };

  const clusterColors: Record<string, string> = {
    emerging: "bg-neon-blue/10 text-neon-blue border-neon-blue/20",
    core: "bg-emerald/10 text-emerald border-emerald/20",
    mature: "bg-warning/10 text-warning border-warning/20",
  };

  const getClusterStyle = (cluster?: string) => {
    if (!cluster) return "bg-muted/30 text-muted-foreground border-border";
    return clusterColors[cluster.toLowerCase()] || "bg-muted/30 text-muted-foreground border-border";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4">

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left - Store selector + Date */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-background/80 border border-border/50 p-1.5 flex items-center justify-center">
              <img alt="Ecom Peregrinus" className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" src="/lovable-uploads/2f12a5a6-9e0e-4367-a737-5d6a8137e4bd.png" />
            </div>
            <Store className="w-4 h-4 text-neon-blue" />

            <Popover open={storeOpen} onOpenChange={setStoreOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={storeOpen}
                  className="w-[340px] justify-between glass-card border-glass-border bg-card/60 font-normal"
                >
                  {selectedSellerObj ? (
                    <span className="truncate">
                      <span className="text-xs text-muted-foreground mr-1">Loja:</span>
                      <span className="font-medium">{selectedSellerObj.nickname}</span>
                      <span className="mx-2 text-border">|</span>
                      <span className="text-xs text-muted-foreground mr-1">ID:</span>
                      <span className="text-xs font-mono">{selectedSellerObj.custId}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Selecionar loja...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0 bg-card border-glass-border" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Pesquisar por nome ou Cust ID..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                    <CommandGroup>
                      {sellers.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.nickname} ${s.custId}`}
                          onSelect={() => {
                            onSellerChange(s.id);
                            setStoreOpen(false);
                            setActivePeriod("all"); // Reset period on seller change
                          }}
                          className="cursor-pointer"
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedSeller === s.id ? "opacity-100 text-neon-blue" : "opacity-0")} />
                          <div className="flex items-center gap-1 truncate">
                            <span className="text-xs text-muted-foreground">Loja:</span>
                            <span className="font-medium">{s.nickname}</span>
                            <span className="mx-1 text-border">|</span>
                            <span className="text-xs text-muted-foreground">ID:</span>
                            <span className="text-xs font-mono">{s.custId}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range Picker with Quick Periods */}
          <div className="flex items-center gap-2">
            {/* Quick period buttons */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
              {quickRanges.map((qr) => (
                <button
                  key={qr.key}
                  onClick={() => handleQuickRange(qr)}
                  className={cn(
                    "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all",
                    activePeriod === qr.key
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {qr.label}
                </button>
              ))}
            </div>

            {periodWarning && (
              <span className="text-[10px] text-warning bg-warning/10 border border-warning/20 px-2 py-1 rounded-md whitespace-nowrap">
                ⚠ {periodWarning}
              </span>
            )}

            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal glass-card border-glass-border bg-card/60", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-neon-blue" />
                  {dateRange?.from ?
                    dateRange.to ?
                      <>
                        {format(dateRange.from, "dd MMM", { locale: ptBR })} - {format(dateRange.to, "dd MMM", { locale: ptBR })}
                      </> :
                      format(dateRange.from, "dd MMM yyyy", { locale: ptBR }) :
                    "Selecionar período"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-glass-border" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    onDateRangeChange(range);
                    setActivePeriod("custom");
                  }}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Refresh button */}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="glass-card border-glass-border bg-card/60 h-9 w-9"
                title="Atualizar dados"
              >
                <RefreshCw className={cn("h-4 w-4 text-neon-blue", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>

        {/* Right - AI Projection */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card-highlight p-6 neon-border w-full lg:w-auto lg:min-w-[420px]">

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-neon-blue animate-pulse-neon" />
              <h3 className="text-sm font-semibold uppercase tracking-wider neon-text">
                Projeção de Crescimento
              </h3>
              <TooltipInfo text="Calculado comparando sua performance real com a média esperada da sua Vertical e Domínio. Projeção proporcional ao período selecionado." />
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
              Base: {rangeDays}d
            </span>
          </div>
          <div className="flex gap-8 justify-around">
            {projections.map((p) =>
              <div key={p.days} className="text-center min-w-[80px]">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{p.days} dias</p>
                <p className="font-mono font-bold text-2xl emerald-text">
                  R$ {(p.value / 1000).toFixed(0)}K
                </p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  {clampedUplift >= 0 ? <TrendingUp className="w-4 h-4 text-emerald" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  <span className={cn("text-sm font-medium", clampedUplift >= 0 ? "text-emerald" : "text-destructive")}>{clampedUplift >= 0 ? "+" : ""}{(clampedUplift * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Segmentation & Context Badges */}
      {selectedSellerObj && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {/* Safra (latest date in ALL kpis) */}
          {allKpis.length > 0 && (() => {
            const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort();
            const latestDate = dates[dates.length - 1];
            const safraLabel = latestDate ? parseLocalDate(latestDate).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : null;
            return safraLabel ? (
              <span className="status-badge bg-neon-blue/10 text-neon-blue border-neon-blue/20">
                <CalendarDays className="w-3 h-3" />
                Safra: {safraLabel.charAt(0).toUpperCase() + safraLabel.slice(1)}
              </span>
            ) : null;
          })()}

          {/* Meses no Programa */}
          {allKpis.length > 0 && (() => {
            const dates = allKpis.map((k: any) => k.date).filter(Boolean).sort();
            if (dates.length < 2) return null;
            const first = parseLocalDate(dates[0]);
            const last = parseLocalDate(dates[dates.length - 1]);
            const months = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
            return (
              <span className="status-badge bg-primary/10 text-primary border-primary/20">
                <Clock className="w-3 h-3" />
                {months} {months === 1 ? "mês" : "meses"} no programa
              </span>
            );
          })()}

          {selectedSellerObj.cluster && (
            <span className={`status-badge ${getClusterStyle(selectedSellerObj.cluster)}`}>
              <Layers className="w-3 h-3" />
              Segmentação: {selectedSellerObj.cluster}
            </span>
          )}
          {selectedSellerObj.subCluster && (
            <span className="status-badge bg-muted/30 text-muted-foreground border-border">
              <Tag className="w-3 h-3" />
              Sub: {selectedSellerObj.subCluster}
            </span>
          )}
          {selectedSellerObj.state && (
            <span className="status-badge bg-muted/30 text-muted-foreground border-border">
              <MapPin className="w-3 h-3" />
              {selectedSellerObj.state}
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default DashboardHeader;
