import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TrendingUp, TrendingDown, Sparkles, Store, Check, ChevronsUpDown, RefreshCw, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";
import TooltipInfo from "./TooltipInfo";
import { useJuniorMode } from "@/hooks/useJuniorMode";
import { GraduationCap } from "lucide-react";

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
  const [storeOpen, setStoreOpen] = useState(false);
  const [activePeriod, setActivePeriod] = useState<string>("");
  const [copiedField, setCopiedField] = useState<"nickname" | "custId" | null>(null);
  const { playClick } = useSoundFeedback();
  const { enabled: juniorMode, toggle: toggleJunior } = useJuniorMode();

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

  const selectedSellerObj = sellers.find((s) => s.id === selectedSeller);

  const handleCopy = async (
    e: React.MouseEvent,
    value: string,
    field: "nickname" | "custId",
    label: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast({ title: `${label} copiado`, description: value });
      setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 2000);
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
    }
  };

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

  // Sem base de cálculo → exibir "—" em vez de 0,0%
  const temBaseProjecao = validUplifts.length > 0 && totalGmv > 0;

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

    // Find the best year for this quarter: prefer latestYear, fallback to latestYear-1
    const startMonth = qr.months[0];
    const endMonth = qr.months[qr.months.length - 1];
    
    const hasDataInYear = (y: number) =>
      allKpis.some((k: any) => {
        if (!k.date) return false;
        const [ky, km] = k.date.split("-").map(Number);
        return ky === y && km >= startMonth && km <= endMonth;
      });

    const year = hasDataInYear(latestYear) ? latestYear : latestYear - 1;
    const from = new Date(year, startMonth - 1, 1);
    const to = new Date(year, endMonth, 0);
    onDateRangeChange({ from, to });
  };

  // Trimestres que possuem dado (no ano mais recente ou no anterior)
  const quartersComDado = useMemo(() => {
    const set = new Set<string>();
    for (const qr of quickRanges) {
      const startMonth = qr.months[0];
      const endMonth = qr.months[qr.months.length - 1];
      const has = allKpis.some((k: any) => {
        if (!k.date) return false;
        const [ky, km] = String(k.date).split("-").map(Number);
        return (ky === latestYear || ky === latestYear - 1) && km >= startMonth && km <= endMonth;
      });
      if (has) set.add(qr.key);
    }
    return set;
  }, [allKpis, latestYear]);

  // Abre sempre no período mais RECENTE COM DADO
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (allKpis.length === 0) return;
    const anchorMonth = anchorDate.getMonth() + 1;
    const anchorQ = `q${Math.ceil(anchorMonth / 3)}`;
    const alvo =
      [...quickRanges].reverse().find((qr) => qr.key === anchorQ && quartersComDado.has(qr.key)) ??
      [...quickRanges].reverse().find((qr) => quartersComDado.has(qr.key));
    if (!alvo) return;
    initialized.current = true;
    setActivePeriod(alvo.key);
    onPeriodChange?.(alvo.key);
    const startMonth = alvo.months[0];
    const endMonth = alvo.months[alvo.months.length - 1];
    const hasDataInYear = (y: number) =>
      allKpis.some((k: any) => {
        if (!k.date) return false;
        const [ky, km] = String(k.date).split("-").map(Number);
        return ky === y && km >= startMonth && km <= endMonth;
      });
    const year = hasDataInYear(latestYear) ? latestYear : latestYear - 1;
    onDateRangeChange({ from: new Date(year, startMonth - 1, 1), to: new Date(year, endMonth, 0) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKpis, quartersComDado, anchorDate, latestYear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4">

      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 xl:gap-4 w-full min-w-0">
        {/* Left - Store selector + Date */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                  className="w-full sm:w-auto sm:min-w-[300px] sm:max-w-[560px] max-w-full h-auto min-h-10 py-1.5 justify-between glass-card border-glass-border bg-card/60 font-normal"
                >
                  {selectedSellerObj ? (
                    <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-left min-w-0">
                      <span className="text-xs text-muted-foreground mr-1">Loja:</span>
                      <span className="font-medium break-all">{selectedSellerObj.nickname}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Copiar nome da loja"
                        title="Copiar nome da loja"
                        onClick={(e) => handleCopy(e, selectedSellerObj.nickname, "nickname", "Loja")}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/60 text-muted-foreground hover:text-neon-blue transition-colors"
                      >
                        {copiedField === "nickname" ? (
                          <Check className="w-3 h-3 text-emerald" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </span>
                      <span className="mx-1 text-border">|</span>
                      <span className="text-xs text-muted-foreground mr-1">ID:</span>
                      <span className="text-xs font-mono break-all tnum">{selectedSellerObj.custId}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Copiar ID"
                        title="Copiar ID do seller"
                        onClick={(e) => handleCopy(e, selectedSellerObj.custId, "custId", "ID")}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted/60 text-muted-foreground hover:text-neon-blue transition-colors"
                      >
                        {copiedField === "custId" ? (
                          <Check className="w-3 h-3 text-emerald" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Todas as lojas da sua carteira</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0 bg-card border-glass-border" align="start">
                <Command
                  className="bg-transparent"
                  filter={(value, search) => {
                    const norm = (s: string) =>
                      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
                    const haystack = norm(value);
                    const needle = norm(search);
                    if (!needle) return 1;
                    return haystack.includes(needle) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Pesquisar por nome ou Cust ID..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Todas as lojas da sua carteira consolidado"
                        onSelect={() => {
                          onSellerChange("");
                          setStoreOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", !selectedSeller ? "opacity-100 text-neon-blue" : "opacity-0")} />
                        <span className="font-medium">Todas as lojas da sua carteira</span>
                      </CommandItem>
                      {sellers.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.nickname} ${s.custId}`}
                          onSelect={() => {
                            onSellerChange(s.id);
                            setStoreOpen(false);
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
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Quick period buttons */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/50">
              {quickRanges.map((qr) => (
                <button
                  key={qr.key}
                  onClick={() => handleQuickRange(qr)}
                  disabled={!quartersComDado.has(qr.key)}
                  title={quartersComDado.has(qr.key) ? undefined : `Sem dados disponíveis para ${qr.label}`}
                  className={cn(
                    "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all",
                    !quartersComDado.has(qr.key) && "opacity-40 cursor-not-allowed",
                    activePeriod === qr.key
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {qr.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                playClick();
                setActivePeriod("all");
                onPeriodChange?.("all");
                onDateRangeChange({ from: minDate, to: anchorDate });
              }}
              className={cn(
                "px-3 py-1.5 text-[11px] font-medium rounded-md transition-all border",
                activePeriod === "all"
                  ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/50"
              )}
            >
              Todo Período
            </button>

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

            {/* Junior Mode toggle */}
            <button
              onClick={toggleJunior}
              title={juniorMode ? "Modo Didático ativo — clique para Modo Avançado" : "Modo Avançado — clique para ativar Modo Didático"}
              className={cn(
                "h-9 px-2.5 inline-flex items-center gap-1.5 rounded-md border text-[11px] font-medium transition-all",
                juniorMode
                  ? "bg-neon-blue/10 text-neon-blue border-neon-blue/30"
                  : "bg-card/60 text-muted-foreground border-border hover:text-foreground",
              )}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              {juniorMode ? "Modo Didático" : "Modo Avançado"}
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default DashboardHeader;
