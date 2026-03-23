import { useMemo } from "react";
import { ExternalLink, ShieldAlert, AlertTriangle, Clock, CheckCircle, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useSellerGrants, getGrantLevel, getGrantBadge, type SellerGrant } from "@/hooks/useSellerGrants";
import { Badge } from "@/components/ui/badge";

interface GrantsPanelProps {
  sellers: { id: string; nickname: string; custId: string }[];
}

const levelOrder = { blacklist: 0, critical: 1, warning: 2, ok: 3 };

const levelIcon = {
  blacklist: ShieldAlert,
  critical: AlertTriangle,
  warning: Clock,
  ok: CheckCircle,
};

export default function GrantsPanel({ sellers }: GrantsPanelProps) {
  const sellerIds = useMemo(() => sellers.map((s) => s.id), [sellers]);
  const { grants, loading } = useSellerGrants(sellerIds);

  const rows = useMemo(() => {
    return sellers
      .map((s) => {
        const grant = grants[s.id] || null;
        const level = grant ? getGrantLevel(grant.daysToExpire) : null;
        return { seller: s, grant, level };
      })
      .filter((r) => r.grant !== null)
      .sort((a, b) => levelOrder[a.level!] - levelOrder[b.level!]);
  }, [sellers, grants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
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

  // Summary counts
  const counts = useMemo(() => {
    const c = { blacklist: 0, critical: 0, warning: 0, ok: 0 };
    rows.forEach((r) => { if (r.level) c[r.level]++; });
    return c;
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
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

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard emoji="🔴" label="Urgente" count={counts.blacklist} className="border-destructive/50 bg-destructive/10 text-destructive" />
        <SummaryCard emoji="🚨" label="Crítico" count={counts.critical} className="border-destructive/30 bg-destructive/5 text-destructive" />
        <SummaryCard emoji="⚠️" label="Atenção" count={counts.warning} className="border-warning/40 bg-warning/5 text-warning" />
        <SummaryCard emoji="✅" label="OK" count={counts.ok} className="border-emerald-500/30 bg-emerald-500/5 text-emerald-400" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left p-3 font-medium">Seller</th>
                <th className="text-left p-3 font-medium">Cust ID</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Dias p/ Expirar</th>
                <th className="text-center p-3 font-medium">Data Expiração</th>
                <th className="text-center p-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const badge = getGrantBadge(row.level!);
                const Icon = levelIcon[row.level!];
                return (
                  <motion.tr
                    key={row.seller.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`border-b border-border/20 hover:bg-accent/5 transition-colors ${row.level === "blacklist" ? "animate-pulse" : ""}`}
                  >
                    <td className="p-3 font-medium">{row.seller.nickname}</td>
                    <td className="p-3 text-muted-foreground">{row.seller.custId}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={`${badge.className} text-xs gap-1`}>
                        <Icon className="w-3 h-3" />
                        {badge.emoji} {badge.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={row.grant!.daysToExpire <= 0 ? "text-destructive" : row.level === "warning" ? "text-warning" : row.level === "ok" ? "text-emerald-400" : "text-destructive"}>
                        {row.grant!.daysToExpire}
                      </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {row.grant!.expirationDate}
                    </td>
                    <td className="p-3 text-center">
                      {row.grant!.salesforceUrl ? (
                        <a
                          href={row.grant!.salesforceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                        >
                          Renovar
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ emoji, label, count, className }: { emoji: string; label: string; count: number; className: string }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${className}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1">{emoji} {label}</p>
    </div>
  );
}
