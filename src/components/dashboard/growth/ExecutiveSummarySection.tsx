import { useMemo } from "react";
import { DollarSign, Receipt, Megaphone, Gauge } from "lucide-react";
import type { SellerKPI } from "@/hooks/useSellerData";
import GrowthMetricCard from "./GrowthMetricCard";
import { fmtMoneyGrowth, fmtPctGrowth, fmtRoasGrowth } from "./growthFormat";

type Props = {
  kpis: SellerKPI[];
  periodLabel: string;
};

function sum(kpis: SellerKPI[], key: keyof SellerKPI): number {
  return kpis.reduce((s, k) => s + (Number(k[key]) || 0), 0);
}

/**
 * Seção 1 — Macro / North Star.
 * Apenas TGMV, GMV faturado, Ads e ROAS global (sem canais secundários).
 */
export function ExecutiveSummarySection({ kpis, periodLabel }: Props) {
  const m = useMemo(() => {
    const tgmv = sum(kpis, "tgmv");
    const gmv = sum(kpis, "gmv");
    const ads = sum(kpis, "adsInvestment");
    const tgmvPads = sum(kpis, "tgmvPads");
    const roas = ads > 0 ? tgmvPads / ads : 0;
    const gmvShare = tgmv > 0 ? (gmv / tgmv) * 100 : 0;

    // Variação vs período anterior no mesmo conjunto (uplift médio ponderado por GMV)
    const withUplift = kpis.filter((k) => k.upliftGmvM1 !== 0 && k.gmvM1 > 0);
    let deltaTgmv: number | null = null;
    if (withUplift.length > 0) {
      const w = withUplift.reduce((s, k) => s + k.gmv, 0) || 1;
      deltaTgmv =
        (withUplift.reduce((s, k) => s + k.upliftGmvM1 * k.gmv, 0) / w) * 100;
    }

    return { tgmv, gmv, ads, roas, gmvShare, deltaTgmv };
  }, [kpis]);

  return (
    <section className="space-y-3" aria-labelledby="growth-exec-title">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Seção 1 · Macro
          </p>
          <h2 id="growth-exec-title" className="text-lg font-semibold text-slate-900 tracking-tight">
            Executive Summary
          </h2>
          <p className="text-sm text-slate-500">North Star do período — sem canais secundários.</p>
        </div>
        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 font-mono tabular-nums">
          {periodLabel}
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <GrowthMetricCard
          icon={DollarSign}
          label="TGMV"
          value={fmtMoneyGrowth(m.tgmv)}
          hint="Total Gross Merchandise Value (líquido de cancelamentos)"
          delta={
            m.deltaTgmv != null
              ? {
                  value: fmtPctGrowth(m.deltaTgmv),
                  positive: m.deltaTgmv >= 0,
                }
              : undefined
          }
        />
        <GrowthMetricCard
          icon={Receipt}
          label="GMV Faturado"
          value={fmtMoneyGrowth(m.gmv)}
          hint={
            m.tgmv > 0
              ? `${m.gmvShare.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do TGMV`
              : "Participação vs TGMV indisponível"
          }
        />
        <GrowthMetricCard
          icon={Megaphone}
          label="Investimento em Ads"
          value={fmtMoneyGrowth(m.ads)}
          hint="Ad spend total (Product Ads / PADS)"
        />
        <GrowthMetricCard
          icon={Gauge}
          label="ROAS / Eficiência Global"
          value={fmtRoasGrowth(m.roas)}
          hint="Σ TGMV Ads ÷ Σ investimento — razão dos totais"
        />
      </div>
    </section>
  );
}

export default ExecutiveSummarySection;
