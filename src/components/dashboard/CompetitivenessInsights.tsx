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
      // Janelas equivalentes: mesmo número de períodos em cada metade (o do meio fica de fora se ímpar).
      const meia = Math.floor(dates.length / 2);
      const firstHalf = dates.slice(0, meia);
      const secondHalf = dates.slice(dates.length - meia);

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
          text: `A participação da faixa de preço alto caiu ${fmtNum(gapDelta, 1)} p.p. entre as duas metades equivalentes do período${visitsDelta !== 0 ? `; no mesmo intervalo as visitas variaram ${fmtNum(visitsDelta, 0)}% (variação observada, sem relação de causa comprovada)` : ""}. Continue monitorando os preços rivais.`,
          type: "positive",
        });
      } else if (gapDelta < -2) {
        result.push({
          icon: TrendingDown,
          title: "Competitividade em Queda",
          text: `A participação da faixa de preço alto subiu ${fmtNum(Math.abs(gapDelta), 1)} p.p. entre as duas metades equivalentes do período. Vale revisar os preços dos itens de maior volume.`,
          type: "critical",
        });
      }
    }

    // ── Visit Distribution Alert ──
    if (pctExpensive > 60) {
      result.push({
        icon: AlertTriangle,
        title: "Concentração de Preço Alto",
        text: `${fmtNum(pctExpensive, 0)}% da composição das faixas de preço está na faixa de preço alto frente ao rival. Recomenda-se auditoria de preços nos itens de maior volume.`,
        type: "critical",
      });
    } else if (pctExpensive > 40) {
      result.push({
        icon: AlertTriangle,
        title: "Atenção ao Preço",
        text: `${fmtNum(pctExpensive, 0)}% da composição das faixas de preço está na faixa de preço alto frente ao rival. Monitore de perto.`,
        type: "critical",
      });
    } else if (pctCheaper > 60) {
      result.push({
        icon: Lightbulb,
        title: "Posição de Preço Vantajosa",
        text: `${fmtNum(pctCheaper, 0)}% da composição das faixas de preço está na faixa mais barata que o rival. Pode haver espaço para testar ajustes marginais de preço, acompanhando o resultado.`,
        type: "positive",
      });
    }

    // ── Price vs Volume Elasticity ──
    if (dates.length >= 4) {
      const meiaQ = Math.floor(dates.length / 2);
      const firstQ = dates.slice(0, meiaQ);
      const secondQ = dates.slice(dates.length - meiaQ);

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
          title: "Preço rival em queda",
          text: `O menor preço rival caiu ${fmtNum(Math.abs(priceDelta), 1)}% entre metades equivalentes do período, e seu faturamento variou ${fmtNum(gmvDelta, 1)}%. São variações observadas no mesmo intervalo; não medem elasticidade nem causa.`,
          type: "neutral",
        });
      } else if (priceDelta < -3 && gmvDelta > 10) {
        result.push({
          icon: Lightbulb,
          title: "Preço rival em queda e faturamento em alta",
          text: `O menor preço rival caiu ${fmtNum(Math.abs(priceDelta), 1)}% e seu faturamento subiu ${fmtNum(gmvDelta, 1)}% entre metades equivalentes do período. Variações observadas juntas, sem relação de causa comprovada.`,
          type: "positive",
        });
      } else if (priceDelta > 3 && gmvDelta > 0) {
        result.push({
          icon: Lightbulb,
          title: "Preço rival em alta",
          text: `O menor preço rival subiu ${fmtNum(priceDelta, 1)}% e seu faturamento cresceu ${fmtNum(gmvDelta, 1)}% entre metades equivalentes do período. Variações observadas juntas, sem relação de causa comprovada.`,
          type: "positive",
        });
      }
    }

    // Faturamento médio não demonstra liderança de categoria; leitura removida.
    void totalGmv;

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
