import { AlertTriangle, TrendingUp, Truck, Camera, TrendingDown, Zap, ShoppingCart, Search, BarChart3 } from "lucide-react";
import type { SellerWithKpi } from "@/hooks/usePortfolios";
import type { SellerTrend } from "@/hooks/usePortfolioTrends";
import type { SellerCampaign } from "@/hooks/useMeliCampaigns";

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
  campaigns?: Record<string, SellerCampaign>;
}

interface Alert {
  icon: typeof AlertTriangle;
  color: string;
  message: string;
  priority: number; // lower = higher priority
}

export default function AlertMatrix({ sellers, trends, campaigns }: Props) {
  if (!sellers.length) return null;

  const alerts: Alert[] = [];

  const sorted = [...sellers].sort((a, b) => b.tgmvLc - a.tgmvLc);
  const top20Idx = Math.max(1, Math.ceil(sellers.length * 0.2));
  const top20Threshold = sorted[top20Idx - 1]?.tgmvLc || 0;

  // Compute visit-based Top 20% threshold for ranking alerts
  const sortedByVisits = [...sellers].filter(s => s.tsi > 0).sort((a, b) => {
    const visitA = (a as any).visits || 0;
    const visitB = (b as any).visits || 0;
    return visitB - visitA;
  });
  const visitTop20Idx = Math.max(1, Math.ceil(sortedByVisits.length * 0.2));

  for (const s of sellers) {
    const adsRatio = safePct(s.invPads, s.tgmvLc);
    const modal = getModalPrincipal(s.tsi, s.fTsi, s.tsiFlex);
    const potenciaFull = safePct(s.fTsi, s.tsi);
    const ticketMedio = s.tsi > 0 ? s.tgmvLc / s.tsi : 0;

    // 🚨 Risco de Churn — queda >15% em seller Curva A
    const trend = trends?.[s.sellerId];
    if (s.tgmvLc >= top20Threshold && trend && (trend.tgmvTrend < -15 || trend.visitsTrend < -15)) {
      alerts.push({
        icon: TrendingDown,
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        message: `🚨 Risco de Churn: ${s.nickname} apresenta queda severa (Fat: ${trend.tgmvTrend.toFixed(0)}%, Visitas: ${trend.visitsTrend.toFixed(0)}%). Plano de ação imediato.`,
        priority: 0,
      });
    }

    // 🚨 Gatilho da Morte — Tráfego sem Conversão (alto tráfego, baixo TSI)
    const visitsVal = (s as any).visits || 0;
    if (visitsVal > 0 && s.tsi > 0) {
      const convRate = (s.tsi / visitsVal) * 100;
      const isHighTraffic = sortedByVisits.indexOf(s) < visitTop20Idx;
      // Average conversion for all sellers
      const avgConv = sellers.reduce((sum, x) => {
        const v = (x as any).visits || 0;
        return v > 0 ? sum + (x.tsi / v) * 100 : sum;
      }, 0) / sellers.filter(x => (x as any).visits > 0).length;

      if (isHighTraffic && convRate < avgConv * 0.6) {
        alerts.push({
          icon: Search,
          color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
          message: `🚨 Queda de Ranking Iminente: ${s.nickname} com alto tráfego mas conversão ${convRate.toFixed(2)}% (média ${avgConv.toFixed(2)}%). O algoritmo irá penalizar. Revise Preço ou Fotos.`,
          priority: 1,
        });
      }
    }

    // 📸 Quality alert
    if (s.scoreQualidadeFinal < 50) {
      alerts.push({
        icon: Camera,
        color: "text-red-400 bg-red-400/10 border-red-400/20",
        message: `📸 Melhorar Fotos: ${s.nickname} com score de catálogo ${s.scoreQualidadeFinal.toFixed(0)} (abaixo de 50).`,
        priority: 2,
      });
    }

    // Subpenetração de Ads (ratio < 1.5% em sellers de alto faturamento)
    if (s.tgmvLc >= top20Threshold && adsRatio < 1.5) {
      alerts.push({
        icon: TrendingUp,
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        message: `📈 Subaproveitamento de Escala: ${s.nickname} com Ads em ${adsRatio.toFixed(1)}%. Aumentar para 3% é a estratégia de menor risco para dominar a vertical.`,
        priority: 3,
      });
    }

    // Vazamento de Margem (ratio > 5%)
    if (adsRatio > 5) {
      alerts.push({
        icon: AlertTriangle,
        color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        message: `⚠️ Vazamento de Margem: ${s.nickname} com custo de aquisição alto (Ads ${adsRatio.toFixed(1)}%). Revisar campanhas.`,
        priority: 4,
      });
    }

    // Oportunidade Logística — modal principal = AGENCIA em seller de alto faturamento
    if (s.tgmvLc >= top20Threshold && modal === "AGENCIA") {
      alerts.push({
        icon: Truck,
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        message: `Oportunidade Logística: ${s.nickname} tem alto volume preso em Agência. Transição para FULL ou FLEX é mandatória para blindar a conta.`,
        priority: 5,
      });
    }

    // ⚠️ Promoções — Alta potência Full mas sem adesão (scoreOfertaFinal baixo)
    if (potenciaFull > 50 && s.scoreOfertaFinal < 30) {
      alerts.push({
        icon: Zap,
        color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
        message: `⚠️ Algoritmo: ${s.nickname} com Potência Full ${potenciaFull.toFixed(0)}% mas fora da Central de Promoções (Score Oferta ${s.scoreOfertaFinal.toFixed(0)}). Aceite ofertas oficiais para subir no ranking.`,
        priority: 6,
      });
    }

    // 🛒 Estratégia de Kit — Ticket médio baixo
    if (ticketMedio > 0 && ticketMedio < 50 && s.tsi >= 10) {
      alerts.push({
        icon: ShoppingCart,
        color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
        message: `Oportunidade: ${s.nickname} com ticket médio R$${ticketMedio.toFixed(0)}. Crie anúncios em formato KIT para diluir frete e ganhar prioridade no algoritmo.`,
        priority: 7,
      });
    }
  }

  // Sort by priority
  alerts.sort((a, b) => a.priority - b.priority);

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
      {alerts.slice(0, 25).map((alert, i) => (
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
