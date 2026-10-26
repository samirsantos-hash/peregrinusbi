import { useMemo } from "react";
import type { SellerKPI } from "@/hooks/useSellerData";
import ExecutiveSummarySection from "./ExecutiveSummarySection";
import TrafficEfficiencySection from "./TrafficEfficiencySection";
import ClipsPerformanceSection from "./ClipsPerformanceSection";
import ConversionFunnelSection from "./ConversionFunnelSection";

type Props = {
  kpis: SellerKPI[];
  dataGranularity?: "consolidated" | "daily";
  periodLabel?: string | null;
  sellerNickname?: string | null;
};

/**
 * Painel Growth — consultoria: Macro → Meso → Micro canal → Funil.
 * Uma composição rolável; sem duplicar CVR fora do funil nem Clips fora da Seção 3.
 */
export function GrowthDashboard({
  kpis,
  dataGranularity = "consolidated",
  periodLabel,
  sellerNickname,
}: Props) {
  const label = useMemo(() => {
    if (periodLabel) return periodLabel;
    if (dataGranularity === "daily") {
      const days = new Set(kpis.map((k) => k.date.slice(0, 10))).size;
      return `${days} ${days === 1 ? "dia" : "dias"}`;
    }
    const months = new Set(kpis.map((k) => k.date.slice(0, 7))).size;
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }, [periodLabel, dataGranularity, kpis]);

  if (!kpis.length) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        Sem KPIs no período selecionado
        {sellerNickname ? ` para ${sellerNickname}` : ""}.
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Growth Consultancy
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            {sellerNickname ? sellerNickname : "Carteira consolidada"}
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-mono tabular-nums rounded-md border border-slate-200 bg-white px-2.5 py-1">
          Período: {label}
        </p>
      </div>

      <ExecutiveSummarySection kpis={kpis} periodLabel={label} />
      <TrafficEfficiencySection
        kpis={kpis}
        dataGranularity={dataGranularity}
        periodLabel={label}
      />
      <ClipsPerformanceSection kpis={kpis} periodLabel={label} />
      <ConversionFunnelSection kpis={kpis} periodLabel={label} />
    </div>
  );
}

export default GrowthDashboard;
