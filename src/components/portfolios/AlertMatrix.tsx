import { AlertTriangle, TrendingUp, Truck } from "lucide-react";
import type { SellerWithKpi } from "@/hooks/usePortfolios";

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

interface Props {
  sellers: SellerWithKpi[];
}

interface Alert {
  type: "opportunity" | "warning" | "logistics";
  icon: typeof AlertTriangle;
  color: string;
  message: string;
}

export default function AlertMatrix({ sellers }: Props) {
  if (!sellers.length) return null;

  const alerts: Alert[] = [];

  // Determine top 20% threshold by tgmvLc
  const sorted = [...sellers].sort((a, b) => b.tgmvLc - a.tgmvLc);
  const top20Idx = Math.max(1, Math.ceil(sellers.length * 0.2));
  const top20Threshold = sorted[top20Idx - 1]?.tgmvLc || 0;

  for (const s of sellers) {
    const adsRatio = safePct(s.invPads, s.tgmvLc);

    // Subinvestimento em Ads
    if (s.tgmvLc >= top20Threshold && adsRatio < 1.5) {
      alerts.push({
        type: "opportunity",
        icon: TrendingUp,
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        message: `Oportunidade: ${s.nickname} escalando organicamente (Ads ${adsRatio.toFixed(1)}%). Aumentar budget para 3% pode dominar a categoria.`,
      });
    }

    // Vazamento de Margem
    if (adsRatio > 5) {
      alerts.push({
        type: "warning",
        icon: AlertTriangle,
        color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        message: `Atenção: ${s.nickname} com custo de aquisição alto (Ads ${adsRatio.toFixed(1)}%). Revisar campanhas.`,
      });
    }

    // Oportunidade Logística
    if (s.tgmvLc > 0 && s.tgmvLcFull < s.tgmvLc * 0.1) {
      alerts.push({
        type: "logistics",
        icon: Truck,
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        message: `${s.nickname} com alto volume, mas baixa adoção de envios rápidos (Full ${safePct(s.tgmvLcFull, s.tgmvLc).toFixed(1)}%). Migrar curva A para FULL é urgente.`,
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground text-center">
          ✅ Nenhum alerta identificado nesta carteira.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
      {alerts.slice(0, 15).map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-lg border ${alert.color}`}
        >
          <alert.icon className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
