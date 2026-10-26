import { useMemo } from "react";
import { Play, Film, PieChart } from "lucide-react";
import type { SellerKPI } from "@/hooks/useSellerData";
import GrowthMetricCard from "./GrowthMetricCard";
import { fmtIntGrowth, fmtMoneyGrowth, fmtPctGrowth } from "./growthFormat";

type Props = {
  kpis: SellerKPI[];
  periodLabel: string;
  /** Lista compacta opcional (elegibilidade / top clips). */
  topItems?: {
    id: string;
    title: string;
    visits: number;
    orders: number;
    status: string;
  }[];
};

/**
 * Seção 3 — Micro canal: métricas e tração de Clips/Vídeos.
 * Único lugar do Resumo Growth onde Clips aparecem (sem repetir CVR geral).
 */
export function ClipsPerformanceSection({ kpis, periodLabel, topItems = [] }: Props) {
  const m = useMemo(() => {
    const visitasClips = kpis.reduce((s, k) => s + (k.visitasClips || 0), 0);
    const tgmvClips = kpis.reduce((s, k) => s + (k.tgmvLcClips || 0), 0);
    const tgmv = kpis.reduce((s, k) => s + (k.tgmv || 0), 0);
    const ordersClips = kpis.reduce((s, k) => s + (k.ordersClips || 0), 0);
    const clipsPubli = kpis.reduce((s, k) => s + (k.sellersClipsPubli || 0), 0);
    const share = tgmv > 0 ? (tgmvClips / tgmv) * 100 : 0;
    return { visitasClips, tgmvClips, share, ordersClips, clipsPubli, tgmv };
  }, [kpis]);

  return (
    <section className="space-y-3" aria-labelledby="growth-clips-title">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
          Seção 3 · Micro canal
        </p>
        <h2 id="growth-clips-title" className="text-lg font-semibold text-slate-900 tracking-tight">
          Performance: Clips & Vídeos
        </h2>
        <p className="text-sm text-slate-500">
          Canal de vídeo isolado · {periodLabel}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <GrowthMetricCard
          icon={Play}
          label="Visitas via Vídeo"
          value={fmtIntGrowth(m.visitasClips)}
          hint={
            m.clipsPubli > 0
              ? `${fmtIntGrowth(m.clipsPubli)} clips publicados (soma do período)`
              : "Publicações: n/d na base"
          }
        />
        <GrowthMetricCard
          icon={Film}
          label="TGMV Gerado por Vídeos"
          value={fmtMoneyGrowth(m.tgmvClips)}
          hint={`${fmtIntGrowth(m.ordersClips)} pedidos atribuídos a Clips`}
        />
        <GrowthMetricCard
          icon={PieChart}
          label="Participação no TGMV"
          value={
            m.tgmv > 0
              ? `${m.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              : "—"
          }
          hint="TGMV Clips ÷ TGMV total da loja"
          delta={
            m.tgmv > 0
              ? { value: fmtPctGrowth(m.share, 1).replace("+", ""), positive: m.share >= 5 }
              : undefined
          }
        />
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Vídeos de maior tração
          </p>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {topItems.length} itens
          </span>
        </div>
        {topItems.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500 text-center">
            Sem ranking de clips no período. Abra a aba Clips para o detalhe completo do catálogo.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topItems.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors duration-150"
              >
                <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 shrink-0">
                  <Play className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {fmtIntGrowth(item.visits)} visitas · {fmtIntGrowth(item.orders)} conv.
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-wide font-medium text-slate-600 border border-slate-200 rounded-md px-2 py-0.5 shrink-0">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ClipsPerformanceSection;
