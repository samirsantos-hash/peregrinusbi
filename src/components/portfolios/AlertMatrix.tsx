import { AlertTriangle, TrendingUp, Truck, Camera, TrendingDown } from "lucide-react";
import type { SellerWithKpi } from "@/hooks/usePortfolios";
import type { SellerTrend } from "@/hooks/usePortfolioTrends";

function safePct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

function getModalPrincipal(tsi: number, fTsi: number, tsiFlex: number): string {
  const tsiOther = Math.max(0, tsi - fTsi - tsiFlex);
  if (fTsi >= tsiFlex && fTsi >= tsiOther) return "FULL";
  if (tsiFlex >= fTsi && tsiFlex >= tsiOther) return "FLEX";
  return "AGENCIA";
}

interface Props {
  sellers: SellerWithKpi[];
  trends?: Record<string, SellerTrend>;
}

interface Alert {
  icon: typeof AlertTriangle;
  color: string;
  message: string;
}

export default function AlertMatrix({ sellers, trends }: Props) {
  if (!sellers.length) return null;

  const alerts: Alert[] = [];

  const sorted = [...sellers].sort((a, b) => b.tgmvLc - a.tgmvLc);
  const top20Idx = Math.max(1, Math.ceil(sellers.length * 0.2));
  const top20Threshold = sorted[top20Idx - 1]?.tgmvLc || 0;

  for (const s of sellers) {
    const adsRatio = safePct(s.invPads, s.tgmvLc);
    const modal = getModalPrincipal(s.tsi, s.fTsi, s.tsiFlex);

    // 📸 Quality alert
    if (s.scoreQualidadeFinal < 50) {
      alerts.push({
        icon: Camera,
        color: "text-red-400 bg-red-400/10 border-red-400/20",
        message: `0STORE 📸 Melhorar Fotos: ${s.nickname} com score de catálogo ${s.scoreQualidadeFinal.toFixed(0)} (abaixo de 50).`,
      });
    }

    // Subinvestimento em Ads
    if (s.tgmvLc >= top20Threshold && adsRatio < 1.5) {
      alerts.push({
        icon: TrendingUp,
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        message: `Oportunidade: ${s.nickname} escalando organicamente (Ads ${adsRatio.toFixed(1)}%). Aumentar budget para 3% pode dominar a categoria.`,
      });
    }

    // Vazamento de Margem
    if (adsRatio > 5) {
      alerts.push({
        icon: AlertTriangle,
        color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        message: `Atenção: ${s.nickname} com custo de aquisição alto (Ads ${adsRatio.toFixed(1)}%). Revisar campanhas.`,
      });
    }

    // Oportunidade Logística — modal principal = AGENCIA em seller de alto faturamento
    if (s.tgmvLc >= top20Threshold && modal === "AGENCIA") {
      alerts.push({
        icon: Truck,
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        message: `Oportunidade Logística: ${s.nickname} tem alto volume preso em Agência. A transição para FULL ou FLEX é mandatória para blindar a conta.`,
      });
    }

    // 🚨 Risco de Churn — queda >15% em seller Curva A
    const trend = trends?.[s.sellerId];
    if (s.tgmvLc >= top20Threshold && trend && (trend.tgmvTrend < -15 || trend.visitsTrend < -15)) {
      alerts.push({
        icon: TrendingDown,
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        message: `🚨 Risco de Churn: ${s.nickname} apresenta queda severa em visitas/vendas (Fat: ${trend.tgmvTrend.toFixed(0)}%, Visitas: ${trend.visitsTrend.toFixed(0)}%). Necessário plano de ação imediato.`,
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
    <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
      {alerts.slice(0, 20).map((alert, i) => (
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
