import { useMemo } from "react";
import type { SellerKPI } from "@/hooks/useSellerData";
import { fmtIntGrowth } from "./growthFormat";

type Props = {
  kpis: SellerKPI[];
  periodLabel: string;
};

type Stage = {
  id: string;
  label: string;
  value: number;
  estimated?: boolean;
};

/**
 * Seção 4 — Funil contínuo Visitas → Pedidos.
 *
 * A base do seller expõe Visitas e Pedidos (TSI). Etapas intermediárias
 * (PDP implícito = visitas a anúncio; ATC e Checkout) são modeladas de
 * forma monótona a partir da conversão observada — nunca inventam volume
 * acima das visitas nem abaixo dos pedidos.
 */
function buildFunnel(visits: number, orders: number): Stage[] {
  const v = Math.max(0, visits);
  const o = Math.min(Math.max(0, orders), v || orders);

  // PDP ≈ visitas a anúncio (mesma unidade na base ML deste painel).
  const pdp = v;

  // ATC / Checkout: interpolação côncava entre PDP e pedidos.
  // Mantém o = pedidos reais; ATC ≥ checkout ≥ pedidos.
  let atc: number;
  let checkout: number;
  if (v <= 0) {
    atc = 0;
    checkout = 0;
  } else if (o <= 0) {
    atc = Math.round(v * 0.08);
    checkout = Math.round(v * 0.03);
  } else {
    const cvr = o / v;
    // ATC típico ~ 3–12× a taxa de pedido, limitado a 25% das visitas.
    atc = Math.round(Math.min(v * 0.25, Math.max(o * 3, v * Math.min(0.18, cvr * 10))));
    atc = Math.max(atc, o);
    checkout = Math.round(Math.min(atc, Math.max(o, o + (atc - o) * 0.45)));
    checkout = Math.max(checkout, o);
    checkout = Math.min(checkout, atc);
  }

  return [
    { id: "visits", label: "Visitas Totais", value: v },
    { id: "pdp", label: "Visualização de Produto", value: pdp, estimated: false },
    { id: "atc", label: "Add to Cart", value: atc, estimated: true },
    { id: "checkout", label: "Checkout Iniciado", value: checkout, estimated: true },
    { id: "orders", label: "Pedidos Concluídos", value: o },
  ];
}

export function ConversionFunnelSection({ kpis, periodLabel }: Props) {
  const { stages, cvr, worstDrop } = useMemo(() => {
    const visits = kpis.reduce((s, k) => s + (k.visits || 0), 0);
    const orders = kpis.reduce((s, k) => s + (k.tsi || 0), 0);
    const stages = buildFunnel(visits, orders);
    const cvr = visits > 0 ? (orders / visits) * 100 : 0;

    let worstDrop: { from: string; to: string; rate: number } | null = null;
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const to = stages[i + 1];
      if (from.value <= 0) continue;
      const rate = ((from.value - to.value) / from.value) * 100;
      if (!worstDrop || rate > worstDrop.rate) {
        worstDrop = { from: from.label, to: to.label, rate };
      }
    }
    return { stages, cvr, worstDrop };
  }, [kpis]);

  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <section className="space-y-3" aria-labelledby="growth-funnel-title">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
            Seção 4 · Micro operacional
          </p>
          <h2 id="growth-funnel-title" className="text-lg font-semibold text-slate-900 tracking-tight">
            Diagnóstico de Funil de Conversão
          </h2>
          <p className="text-sm text-slate-500">
            Fluxo contínuo · {periodLabel}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">CVR final</p>
          <p className="font-mono tabular-nums text-base font-semibold text-slate-900">
            {cvr.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
          </p>
        </div>
      </header>

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-4 sm:p-6 space-y-5">
        <ol className="space-y-3">
          {stages.map((stage, idx) => {
            const width = Math.max(8, (stage.value / maxVal) * 100);
            const prev = idx > 0 ? stages[idx - 1] : null;
            const stepDrop =
              prev && prev.value > 0
                ? ((prev.value - stage.value) / prev.value) * 100
                : null;
            const isWorst =
              worstDrop &&
              prev &&
              prev.label === worstDrop.from &&
              stage.label === worstDrop.to;

            return (
              <li key={stage.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 w-4">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {stage.label}
                    </span>
                    {stage.estimated && (
                      <span className="text-[10px] text-slate-400 border border-slate-200 rounded px-1">
                        estimado
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0">
                    {stepDrop != null && stepDrop > 0.05 && (
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isWorst ? "text-amber-700 font-semibold" : "text-slate-400"
                        }`}
                      >
                        −{stepDrop.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                      </span>
                    )}
                    <span className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                      {fmtIntGrowth(stage.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      isWorst
                        ? "bg-amber-500/80"
                        : idx === stages.length - 1
                          ? "bg-slate-800"
                          : "bg-slate-400/90"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        {worstDrop && worstDrop.rate > 0 && (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-950">
            <span className="font-medium">Maior abandono: </span>
            {worstDrop.from} → {worstDrop.to}{" "}
            <span className="font-mono tabular-nums font-semibold">
              (−{worstDrop.rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
            </span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Visitas e Pedidos vêm da base. Add to Cart e Checkout são estimados para diagnosticar
          o gargalo relativo — o feed atual não expõe essas etapas. PDP usa a mesma base de visitas
          a anúncio.
        </p>
      </div>
    </section>
  );
}

export default ConversionFunnelSection;
