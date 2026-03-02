import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, TrendingUp, Sparkles, Store, Check, ChevronsUpDown } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";

interface Seller {
  id: string;
  nickname: string;
  custId: string;
}

interface KpiLike {
  gmv: number;
  upliftGmvM1: number;
}

interface DashboardHeaderProps {
  sellers: Seller[];
  selectedSeller: string;
  onSellerChange: (id: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  kpis: KpiLike[];
}

const DashboardHeader = ({ sellers, selectedSeller, onSellerChange, dateRange, onDateRangeChange, kpis }: DashboardHeaderProps) => {
  const [calOpen, setCalOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const selectedSellerObj = sellers.find((s) => s.id === selectedSeller);

  // Calculate the number of days in the selected range
  const rangeDays = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return Math.max(differenceInDays(dateRange.to, dateRange.from), 1);
    }
    return 30;
  }, [dateRange]);

  // AI Projection calc — proportional to selected date range
  // upliftGmvM1 is now a growth rate (e.g. 0.15 = +15%)
  const validUplifts = kpis.filter((k) => k.upliftGmvM1 !== 0);
  const avgUplift = validUplifts.length > 0
    ? validUplifts.reduce((s, k) => s + k.upliftGmvM1, 0) / validUplifts.length
    : 0;
  // Clamp growth rate to reasonable range (-50% to +200%)
  const clampedUplift = Math.max(-0.5, Math.min(2, avgUplift));
  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);
  const dailyGmv = rangeDays > 0 ? totalGmv / rangeDays : 0;

  const projections = [
    { days: 7, value: dailyGmv * 7 * (1 + clampedUplift) },
    { days: 15, value: dailyGmv * 15 * (1 + clampedUplift) },
    { days: 30, value: dailyGmv * 30 * (1 + clampedUplift) },
  ];

  const quickRanges = [
    { label: "7 dias", days: 7 },
    { label: "15 dias", days: 15 },
    { label: "30 dias", days: 30 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

      {/* Left - Store selector + Date */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Logo + Store selector with search */}
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
                        }}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedSeller === s.id ? "opacity-100 text-neon-blue" : "opacity-0")} />
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-xs text-muted-foreground">Loja:</span>
                          <span className="font-medium">{s.nickname}</span>
                          <span className="mx-1 text-border">|</span>
                          <span className="text-xs text-muted-foreground">Cust ID:</span>
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

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal glass-card border-glass-border bg-card/60", !dateRange && "text-muted-foreground")}>
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
              <div className="flex gap-1 p-2 border-b border-border">
                {quickRanges.map((qr) =>
                <Button
                  key={qr.days}
                  variant="ghost"
                  size="sm"
                  className="text-xs hover:bg-muted"
                  onClick={() => {
                    onDateRangeChange({ from: subDays(new Date(), qr.days), to: new Date() });
                    setCalOpen(false);
                  }}>
                    {qr.label}
                  </Button>
                )}
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
                className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Right - AI Projection — proportional to date range */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card-highlight p-6 neon-border w-full lg:w-auto lg:min-w-[420px]">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-blue animate-pulse-neon" />
            <h3 className="text-sm font-semibold uppercase tracking-wider neon-text">
              Projeção de Crescimento (IA)
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
            Base: {rangeDays}d analisados
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
                <TrendingUp className="w-4 h-4 text-emerald" />
                <span className="text-sm font-medium text-emerald">+{(avgUplift * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardHeader;
