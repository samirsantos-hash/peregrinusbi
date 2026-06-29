import { useState, useMemo, useEffect } from "react";
import { BarChart3, Skull, AlertTriangle, Clock, CheckCircle, KeyRound, Wifi, WifiOff, X, Download } from "lucide-react";
import { motion } from "framer-motion";
import { getGrantLevel, getGrantBadge, type SellerGrant } from "@/hooks/useSellerGrants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { abrirSellerNoMeli } from "@/lib/sellerLink";
import * as XLSX from "xlsx";

type GrantFilter = "blacklist" | "critical" | "warning" | "ok" | null;

interface GrantsPanelProps {
  sellers: { id: string; nickname: string; custId: string }[];
}

export default function GrantsPanel({ sellers }: GrantsPanelProps) {
  const [grants, setGrants] = useState<Record<string, SellerGrant>>({});
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GrantFilter>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!sellers.length) { setGrants({}); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("seller_grants" as any)
          .select("*")
          .order("expiration_date", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      if (cancelled) return;
      const map: Record<string, SellerGrant> = {};
      for (const row of all as any[]) {
        const g: SellerGrant = {
          sellerId: row.seller_id,
          custId: String(row.cust_id),
          salesforceUrl: row.salesforce_url,
          expirationDate: row.expiration_date,
          daysToExpire: parseInt(String(row.days_to_expire), 10) || 0,
        };
        if (row.seller_id) map[row.seller_id] = g;
        if (row.cust_id) map[String(row.cust_id)] = g;
      }
      setGrants(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sellers.map((s) => s.id).join(",")]);

  const rows = useMemo(() => {
    return sellers
      .map((s) => {
        const grant = grants[s.id] || grants[s.custId] || null;
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
    let out = rows;
    if (activeFilter) out = out.filter((r) => r.level === activeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.seller.nickname.toLowerCase().includes(q) ||
          String(r.seller.custId).toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, activeFilter, search]);

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
        <p className="text-sm text-muted-foreground">
          Nenhum dado de Grant disponível para os sellers da sua carteira.
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {sellers.length} seller(s) na carteira · {Math.floor(Object.keys(grants).length / 2)} grants acessíveis na base.
        </p>
      </div>
    );
  }

  const total = rows.length;
  const atRisk = counts.blacklist + counts.critical + counts.warning;

  const handleExport = () => {
    const data = filteredRows.map((r) => ({
      Nickname: r.seller.nickname,
      "Cust ID": r.seller.custId,
      "Dias para Expirar": r.days,
      Status: getGrantBadge(r.level!).label,
      "Data de Expiração": r.grant!.expirationDate,
      "Salesforce URL": r.grant!.salesforceUrl || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grants");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `grants_${activeFilter ?? "todos"}_${stamp}.xlsx`);
  };

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

      {/* Active filter + export */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nickname ou Cust ID…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        {activeFilter && (
          <>
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
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          className="ml-auto h-7 text-xs gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar Excel
        </Button>
      </div>

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

        <div key={`${activeFilter ?? "all"}-${search}`} className="divide-y divide-border/20">
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
                  transition={{ duration: 0.18, delay: Math.min(idx, 12) * 0.015 }}
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
                    <button
                      onClick={() => abrirSellerNoMeli(Number(row.seller.custId), row.seller.nickname)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Ver métricas
                    </button>
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
