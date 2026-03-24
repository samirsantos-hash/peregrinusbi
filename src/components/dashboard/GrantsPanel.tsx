import { useState, useMemo } from "react";
import { ExternalLink, Skull, AlertTriangle, Clock, CheckCircle, KeyRound, Wifi, WifiOff, X } from "lucide-react";
import { motion } from "framer-motion";
import { useSellerGrants, getGrantLevel, getGrantBadge } from "@/hooks/useSellerGrants";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type GrantFilter = "blacklist" | "critical" | "warning" | "ok" | null;

interface GrantsPanelProps {
  sellers: { id: string; nickname: string; custId: string }[];
}

export default function GrantsPanel({ sellers }: GrantsPanelProps) {
  const sellerIds = useMemo(() => sellers.map((s) => s.id), [sellers]);
  const { grants, loading } = useSellerGrants(sellerIds);
  const [activeFilter, setActiveFilter] = useState<GrantFilter>(null);

  const rows = useMemo(() => {
    return sellers
      .map((s) => {
        const grant = grants[s.id] || null;
        const days = grant ? Math.round(grant.daysToExpire) : null;
        const level = grant ? getGrantLevel(days!) : null;
        return { seller: s, grant, level, days };
      })
      .filter((r) => r.grant !== null)
      .sort((a, b) => a.days! - b.days!);
  }, [sellers, grants]);

  const counts = useMemo(() => {
    const c = { blacklist: 0, critical: 0, warning: 0, ok: 0 };
    rows.forEach((r) => { if (r.level) c[r.level]++; });
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!activeFilter) return rows;
    return rows.filter((r) => r.level === activeFilter);
  }, [rows, activeFilter]);

  const handleFilterClick = (filter: GrantFilter) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Wifi className="w-5 h-5 animate-pulse mr-2" />
        Carregando dados de grants…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-card p-8 text-center space-y-2">
        <KeyRound className="w-10 h-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum dado de Grant disponível para os sellers da sua carteira.</p>
      </div>
    );
  }

  const total = rows.length;
  const atRisk = counts.blacklist + counts.critical + counts.warning;

  return (
    <div className="space-y-5">
      {/* Interactive filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <FilterCard
          icon={<Skull className="w-4 h-4" />}
          label="Expirado / Urgente"
          sublabel="≤ 5 dias"
          count={counts.blacklist}
          variant="blacklist"
          active={activeFilter === "blacklist"}
          onClick={() => handleFilterClick("blacklist")}
        />
        <FilterCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Crítico"
          sublabel="6-10 dias"
          count={counts.critical}
          variant="critical"
          active={activeFilter === "critical"}
          onClick={() => handleFilterClick("critical")}
        />
        <FilterCard
          icon={<Clock className="w-4 h-4" />}
          label="Atenção"
          sublabel="11-15 dias"
          count={counts.warning}
          variant="warning"
          active={activeFilter === "warning"}
          onClick={() => handleFilterClick("warning")}
        />
        <FilterCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="OK"
          sublabel="> 15 dias"
          count={counts.ok}
          variant="ok"
          active={activeFilter === "ok"}
          onClick={() => handleFilterClick("ok")}
        />
        <div className="rounded-lg border border-border/30 bg-card/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{total}</p>
          <p className="text-xs mt-1 text-muted-foreground">Total monitorados</p>
          {atRisk > 0 && (
            <Badge variant="destructive" className="mt-1 text-[10px]">{atRisk} em risco</Badge>
          )}
        </div>
      </div>

      {/* Active filter indicator */}
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Filtro ativo: <span className="font-semibold text-foreground">{filterLabels[activeFilter]}</span> — {filteredRows.length} seller(s)
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        </div>
      )}

      {/* Connection List */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border/30">
          <WifiOff className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Central de Monitoramento de Conexões
          </span>
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {activeFilter ? `${filteredRows.length} de ${total}` : `${total} sellers`} · Ordenado por criticidade
          </span>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="divide-y divide-border/20">
            {filteredRows.map((row, idx) => {
              const badge = getGrantBadge(row.level!);
              const days = row.days!;
              const isExpired = days <= 0;
              const daysLabel = isExpired
                ? `Expirado há ${Math.abs(days)}d`
                : `${days}d restantes`;

              return (
                <motion.div
                  key={row.seller.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-accent/5 transition-colors ${
                    row.level === "blacklist" ? "bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{row.seller.nickname}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {row.seller.custId}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center min-w-[100px]">
                      <span className={`text-lg font-bold font-mono ${getDaysColor(days)}`}>
                        {isExpired ? days : `+${days}`}
                      </span>
                      <p className={`text-[10px] ${getDaysColor(days)}`}>{daysLabel}</p>
                    </div>
                    <Badge variant="outline" className={`${badge.className} text-[10px] gap-1 shrink-0`}>
                      {badge.emoji} {badge.label}
                    </Badge>
                  </div>

                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-xs text-muted-foreground">{formatDate(row.grant!.expirationDate)}</p>
                  </div>

                  <div className="shrink-0">
                    {row.grant!.salesforceUrl ? (
                      <a
                        href={row.grant!.salesforceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Acessar Salesforce
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs italic">Sem link</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {filteredRows.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum seller nesta categoria.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

const filterLabels: Record<string, string> = {
  blacklist: "Expirado / Urgente (≤5d)",
  critical: "Crítico (6-10d)",
  warning: "Atenção (11-15d)",
  ok: "OK (>15d)",
};

function getDaysColor(days: number): string {
  if (days <= 5) return "text-destructive";
  if (days <= 10) return "text-red-400";
  if (days <= 15) return "text-warning";
  return "text-emerald-400";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

interface FilterCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  count: number;
  variant: string;
  active: boolean;
  onClick: () => void;
}

function FilterCard({ icon, label, sublabel, count, variant, active, onClick }: FilterCardProps) {
  const base: Record<string, string> = {
    blacklist: "border-destructive/60 bg-destructive/10 text-destructive",
    critical: "border-red-500/40 bg-red-500/10 text-red-400",
    warning: "border-warning/40 bg-warning/5 text-warning",
    ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  };
  const activeRing: Record<string, string> = {
    blacklist: "ring-2 ring-destructive shadow-lg shadow-destructive/20",
    critical: "ring-2 ring-red-500 shadow-lg shadow-red-500/20",
    warning: "ring-2 ring-warning shadow-lg shadow-warning/20",
    ok: "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-center transition-all cursor-pointer hover:scale-[1.03] ${base[variant] || "border-border/30"} ${active ? activeRing[variant] : "hover:opacity-80"}`}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="text-[10px] leading-tight font-semibold">{label}</p>
      <p className="text-[9px] leading-tight opacity-60">{sublabel}</p>
    </button>
  );
}
