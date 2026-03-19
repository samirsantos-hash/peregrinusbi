import { useMemo } from "react";
import { ExternalLink, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { SellerGrant } from "@/hooks/useSellerGrants";
import { getGrantLevel, getGrantBadge } from "@/hooks/useSellerGrants";

interface GrantAlertProps {
  grant: SellerGrant | null;
}

export default function GrantAlert({ grant }: GrantAlertProps) {
  const level = grant ? getGrantLevel(grant.daysToExpire) : "ok";

  const config = useMemo(() => {
    if (!grant || level === "ok") return null;
    switch (level) {
      case "blacklist":
        return {
          icon: ShieldAlert,
          border: "border-destructive/60",
          bg: "bg-destructive/10",
          text: "text-destructive",
          pulse: true,
          label: grant.daysToExpire <= 0
            ? `GRANT EXPIRADO há ${Math.abs(grant.daysToExpire)} dia(s)!`
            : `GRANT EXPIRA EM ${grant.daysToExpire} DIA(S)!`,
          desc: "Ação imediata necessária. A conexão será desativada.",
        };
      case "critical":
        return {
          icon: AlertTriangle,
          border: "border-destructive/40",
          bg: "bg-destructive/5",
          text: "text-destructive",
          pulse: false,
          label: `Grant expira em ${grant.daysToExpire} dias`,
          desc: "Solicite a renovação o mais rápido possível.",
        };
      case "warning":
        return {
          icon: Clock,
          border: "border-warning/40",
          bg: "bg-warning/5",
          text: "text-warning",
          pulse: false,
          label: `Grant expira em ${grant.daysToExpire} dias`,
          desc: "Planeje a renovação desta concessão.",
        };
      default:
        return null;
    }
  }, [level, grant]);

  if (!config) return null;

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${config.border} ${config.bg} ${config.pulse ? "animate-pulse" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 ${config.text}`} />
        <div className="min-w-0">
          <p className={`text-sm font-bold ${config.text}`}>{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.desc}</p>
        </div>
      </div>
      {grant.salesforceUrl && (
        <a
          href={grant.salesforceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          Renovar
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}
