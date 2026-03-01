import { useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, TrendingUp, Sparkles, Store } from "lucide-react";
import { format, subDays } from "date-fns";
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

  // AI Projection calc
  const avgUplift = kpis.length > 0 ? kpis.reduce((s, k) => s + k.upliftGmvM1, 0) / kpis.length : 0;
  const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);
  const dailyGmv = totalGmv / 30;

  const projections = [
    { days: 7, value: dailyGmv * 7 * (1 + avgUplift) },
    { days: 15, value: dailyGmv * 15 * (1 + avgUplift) },
    { days: 30, value: dailyGmv * 30 * (1 + avgUplift) },
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
      className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
    >
      {/* Left - Store selector + Date */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Store selector */}
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-neon-blue" />
          <Select value={selectedSeller} onValueChange={onSellerChange}>
            <SelectTrigger className="w-[220px] glass-card border-glass-border bg-card/60 focus:ring-neon-blue/30">
              <SelectValue placeholder="Selecionar loja" />
            </SelectTrigger>
            <SelectContent className="bg-card border-glass-border">
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="focus:bg-muted">
                  <span className="font-medium">{s.nickname}</span>
                  <span className="text-muted-foreground ml-2 text-xs font-mono">{s.custId}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal glass-card border-glass-border bg-card/60", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4 text-neon-blue" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM", { locale: ptBR })} - {format(dateRange.to, "dd MMM", { locale: ptBR })}
                    </>
                  ) : format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
                ) : "Selecionar período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-glass-border" align="start">
              <div className="flex gap-1 p-2 border-b border-border">
                {quickRanges.map((qr) => (
                  <Button
                    key={qr.days}
                    variant="ghost"
                    size="sm"
                    className="text-xs hover:bg-muted"
                    onClick={() => {
                      onDateRangeChange({ from: subDays(new Date(), qr.days), to: new Date() });
                      setCalOpen(false);
                    }}
                  >
                    {qr.label}
                  </Button>
                ))}
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Right - AI Projection */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-card-highlight p-4 neon-border w-full lg:w-auto"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-neon-blue animate-pulse-neon" />
          <h3 className="text-xs font-semibold uppercase tracking-wider neon-text">
            Projeção de Crescimento (IA)
          </h3>
        </div>
        <div className="flex gap-4">
          {projections.map((p) => (
            <div key={p.days} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{p.days}d</p>
              <p className="font-mono font-bold text-sm emerald-text">
                R$ {(p.value / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                <TrendingUp className="w-3 h-3 text-emerald" />
                <span className="text-[10px] text-emerald">+{(avgUplift * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardHeader;
