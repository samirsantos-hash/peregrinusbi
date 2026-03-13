import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { fmtNum, fmtBRLCompact } from "@/utils/formatters";
import TooltipInfo from "./TooltipInfo";

interface KpiLike {
  date: string;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  minPriceRival: number;
  gmv: number;
  adsInvestment?: number;
}

interface Props {
  kpis: KpiLike[];
}

interface Insight {
  icon: typeof Lightbulb;
  title: string;
  text: string;
  type: "positive" | "critical" | "neutral";
}

const CompetitivenessInsights = ({ kpis }: Props) => {
  const insights = useMemo(() => {
    if (kpis.length < 2) return [];

    const result: Insight[] = [];
    const dates = [...new Set(kpis.map((k) => k.date))].sort();

    // ── McKinsey Quadrant Density ──
    const totalGmv = kpis.reduce((s, k) => s + k.gmv, 0);
    const totalExpensive = kpis.reduce((s, k) => s + k.visitsExpensive, 0);
    const totalMatch = kpis.reduce((s, k) => s + k.visitsMatch, 0);
    const totalCheaper = kpis.reduce((s, k) => s + k.visitsCheaper, 0);
    const totalBands = totalExpensive + totalMatch + totalCheaper;
    const pctExpensive = totalBands > 0 ? (totalExpensive / totalBands) * 100 : 0;
    const pctCheaper = totalBands > 0 ? (totalCheaper / totalBands) * 100 : 0;

    // ── Competitiveness Evolution ──
    if (dates.length >= 3) {
      const firstHalf = dates.slice(0, Math.floor(dates.length / 2));
      const secondHalf = dates.slice(Math.floor(dates.length / 2));

      const calcGap = (subset: string[]) => {
        const filtered = kpis.filter((k) => subset.includes(k.date));
        const tExp = filtered.reduce((s, k) => s + k.visitsExpensive, 0);
        const tMatch = filtered.reduce((s, k) => s + k.visitsMatch, 0);
        const tCheap = filtered.reduce((s, k) => s + k.visitsCheaper, 0);
        const total = tExp + tMatch + tCheap;
        return total > 0 ? (tExp / total) * 100 : 0;
      };

      const gapStart = calcGap(firstHalf);
      const gapEnd = calcGap(secondHalf);
      const gapDelta = gapStart - gapEnd; // positive = improved (less expensive)

      const visitsStart = kpis.filter((k) => firstHalf.includes(k.date)).reduce((s, k) => s + k.visits, 0) / firstHalf.length;
      const visitsEnd = kpis.filter((k) => secondHalf.includes(k.date)).reduce((s, k) => s + k.visits, 0) / secondHalf.length;
      const visitsDelta = visitsStart > 0 ? ((visitsEnd - visitsStart) / visitsStart) * 100 : 0;

      if (gapDelta > 2) {
        result.push({
          icon: TrendingUp,
          title: "Competitividade em Alta",
          text: `Sua competitividade média melhorou ${fmtNum(gapDelta, 1)}% no período${visitsDelta > 0 ? `, o que resultou em um aumento de ${fmtNum(visitsDelta, 0)}% nas visitas totais` : ""}. Continue monitorando os preços rivais para manter a tendência.`,
          type: "positive",
        });
      } else if (gapDelta < -2) {
        result.push({
          icon: TrendingDown,
          title: "Competitividade em Queda",
          text: `O gap de preço aumentou ${fmtNum(Math.abs(gapDelta), 1)}% no período. Os rivais estão se tornando mais agressivos. Considere revisar sua estratégia de precificação.`,
          type: "critical",
        });
      }
    }

    // ── Visit Distribution Alert ──
    if (pctExpensive > 60) {
      result.push({
        icon: AlertTriangle,
        title: "Concentração de Preço Alto",
        text: `Alerta: ${fmtNum(pctExpensive, 0)}% das suas visitas estão concentradas em anúncios onde você é mais caro que o rival. O risco de queda na conversão é alto. Recomenda-se auditoria de preços imediata.`,
        type: "critical",
      });
    } else if (pctExpensive > 40) {
      result.push({
        icon: AlertTriangle,
        title: "Atenção ao Preço",
        text: `${fmtNum(pctExpensive, 0)}% das visitas estão em anúncios com preço acima do rival. Monitore de perto — acima de 50% a conversão tende a cair significativamente.`,
        type: "critical",
      });
    } else if (pctCheaper > 60) {
      result.push({
        icon: Lightbulb,
        title: "Posição de Preço Vantajosa",
        text: `${fmtNum(pctCheaper, 0)}% das visitas estão em anúncios com preço abaixo do rival. Você pode testar aumentos marginais de preço para melhorar a margem sem perder competitividade.`,
        type: "positive",
      });
    }

    // ── Price vs Volume Elasticity ──
    if (dates.length >= 4) {
      const firstQ = dates.slice(0, Math.floor(dates.length / 2));
      const secondQ = dates.slice(Math.floor(dates.length / 2));

      const avgPrice1 = (() => {
        const entries = kpis.filter((k) => firstQ.includes(k.date) && k.minPriceRival > 0);
        return entries.length > 0 ? entries.reduce((s, k) => s + k.minPriceRival, 0) / entries.length : 0;
      })();
      const avgPrice2 = (() => {
        const entries = kpis.filter((k) => secondQ.includes(k.date) && k.minPriceRival > 0);
        return entries.length > 0 ? entries.reduce((s, k) => s + k.minPriceRival, 0) / entries.length : 0;
      })();

      const gmv1 = kpis.filter((k) => firstQ.includes(k.date)).reduce((s, k) => s + k.gmv, 0);
      const gmv2 = kpis.filter((k) => secondQ.includes(k.date)).reduce((s, k) => s + k.gmv, 0);

      const priceDelta = avgPrice1 > 0 ? ((avgPrice2 - avgPrice1) / avgPrice1) * 100 : 0;
      const gmvDelta = gmv1 > 0 ? ((gmv2 - gmv1) / gmv1) * 100 : 0;

      if (priceDelta < -3 && gmvDelta < 3) {
        result.push({
          icon: Target,
          title: "Baixa Elasticidade de Preço",
          text: `O preço rival caiu ${fmtNum(Math.abs(priceDelta), 1)}% mas o volume de vendas não acompanhou (+${fmtNum(gmvDelta, 1)}%). Recomenda-se voltar ao preço anterior e focar em Ads para gerar demanda.`,
          type: "neutral",
        });
      } else if (priceDelta < -3 && gmvDelta > 10) {
        result.push({
          icon: Lightbulb,
          title: "Alta Elasticidade de Preço",
          text: `A redução de preço de ${fmtNum(Math.abs(priceDelta), 1)}% gerou um aumento de ${fmtNum(gmvDelta, 1)}% no volume. O mercado responde bem a promoções — considere escalar campanhas de desconto.`,
          type: "positive",
        });
      } else if (priceDelta > 3 && gmvDelta > 0) {
        result.push({
          icon: Lightbulb,
          title: "Poder de Precificação",
          text: `Mesmo com o preço rival subindo ${fmtNum(priceDelta, 1)}%, seu GMV cresceu ${fmtNum(gmvDelta, 1)}%. Isso indica forte posicionamento de marca — teste aumentos de margem.`,
          type: "positive",
        });
      }
    }

    // ── Market Share / Dominance Insight ──
    const avgGmvPerDay = totalGmv / Math.max(dates.length, 1);
    if (avgGmvPerDay > 50000 && pctExpensive < 20) {
      result.push({
        icon: Lightbulb,
        title: "Líder de Categoria",
        text: `Com faturamento médio de ${fmtBRLCompact(avgGmvPerDay)}/dia e apenas ${fmtNum(pctExpensive, 0)}% de visitas caras, sua conta atingiu a Liderança de Categoria. O crescimento agora virá da otimização de margem e não apenas de volume.`,
        type: "positive",
      });
    }

    return result;
  }, [kpis]);

  if (insights.length === 0) return null;

  const typeStyles = {
    positive: "border-emerald/30 bg-emerald/5",
    critical: "border-destructive/30 bg-destructive/5",
    neutral: "border-border/50 bg-muted/30",
  };

  const iconStyles = {
    positive: "text-emerald",
    critical: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Leitura Estratégica do Consultor
        </h3>
        <TooltipInfo text="Insights gerados automaticamente a partir da análise dos dados de preço, competitividade e volume do período selecionado." />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`rounded-xl border p-4 ${typeStyles[insight.type]}`}
          >
            <div className="flex items-start gap-3">
              <insight.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconStyles[insight.type]}`} />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CompetitivenessInsights;
