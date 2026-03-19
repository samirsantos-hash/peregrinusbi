import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Skull, Shield } from "lucide-react";
import type { SellerGrant, GrantLevel } from "@/hooks/useSellerGrants";
import { getGrantLevel, getGrantBadge } from "@/hooks/useSellerGrants";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

interface Props {
  sellers: SellerWithKpi[];
  grants: Record<string, SellerGrant>;
  activeFilter: GrantLevel | null;
  onFilterChange: (level: GrantLevel | null) => void;
}

function LevelIcon({ level }: { level: GrantLevel }) {
  switch (level) {
    case "blacklist": return <Skull className="w-4 h-4" />;
    case "critical": return <AlertTriangle className="w-4 h-4" />;
    case "warning": return <Clock className="w-4 h-4" />;
    default: return <Shield className="w-4 h-4" />;
  }
}

export default function GrantsMonitor({ sellers, grants, activeFilter, onFilterChange }: Props) {
  const atRisk = useMemo(() => {
    const groups: Record<GrantLevel, { seller: SellerWithKpi; grant: SellerGrant }[]> = {
      blacklist: [], critical: [], warning: [], ok: [],
    };

    for (const s of sellers) {
      const g = grants[s.sellerId];
      if (!g) continue;
      const level = getGrantLevel(g.daysToExpire);
      if (level !== "ok") {
        groups[level].push({ seller: s, grant: g });
      }
    }

    return groups;
  }, [sellers, grants]);

  const totalAtRisk = atRisk.blacklist.length + atRisk.critical.length + atRisk.warning.length;

  if (totalAtRisk === 0) return null;

  const levels: GrantLevel[] = ["blacklist", "critical", "warning"];

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          Status de Conexão (Grants)
          <Badge variant="destructive" className="text-[10px] ml-auto">{totalAtRisk} em risco</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {levels.map((level) => {
          const items = atRisk[level];
          if (items.length === 0) return null;
          const badge = getGrantBadge(level);
          const isActive = activeFilter === level;

          return (
            <div
              key={level}
              className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                isActive ? "ring-2 ring-primary" : ""
              } ${badge.className}`}
              onClick={() => onFilterChange(isActive ? null : level)}
            >
              <div className="flex items-center gap-2 mb-1">
                <LevelIcon level={level} />
                <span className="text-xs font-bold uppercase">{badge.emoji} {badge.label}</span>
                <Badge variant="outline" className="text-[10px] ml-auto border-current">
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map(({ seller, grant }) => (
                  <p key={seller.sellerId} className="text-[11px] truncate">
                    {seller.nickname} — <span className="font-mono">{grant.daysToExpire}d</span>
                  </p>
                ))}
                {items.length > 3 && (
                  <p className="text-[10px] opacity-70">+{items.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
