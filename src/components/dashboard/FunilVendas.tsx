import NumeroAnimado from "@/components/ds/NumeroAnimado";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { brl, num, pct } from "@/lib/format";
import TooltipInfo from "./TooltipInfo";
import { funilCincoEtapas } from "@/lib/funilCincoEtapas";

interface KpiFunil {
  visits: number;
  tsi: number;
  gmv: number;
  tgmv?: number;
  bpc?: number | null;
}

/** Seção 4 — funil de 5 etapas. ATC/Checkout são estimativas rotuladas. */
export default function FunilVendas({ kpis, periodo }: { kpis: KpiFunil[]; periodo?: string }) {
  const d = useMemo(() => {
    const s = (f: (k: KpiFunil) => number) => kpis.reduce((a, k) => a + (Number(f(k)) || 0), 0);
    const visitas = s((k) => k.visits);
    const unidades = s((k) => k.tsi);
    const fat = s((k) => k.tgmv || k.gmv);
    const bpcs = kpis.map((k) => k.bpc).filter((v): v is number => v != null && Number.isFinite(v));
    const bpcMedio = bpcs.length ? bpcs.reduce((a, b) => a + b, 0) / bpcs.length : null;
    return { visitas, unidades, fat, bpcMedio, funil: funilCincoEtapas(visitas, unidades) };
  }, [kpis]);

  if (d.visitas <= 0) {
    return (
      <div className="ds-kpi rounded-xl p-5 text-sm text-slate-600">
        Funil de vendas: sem visitas no período — carregue a base de visitas para ver a conversão.
      </div>
    );
  }

  const { etapas, cvr, maiorAbandono } = d.funil;
  const ticket = d.unidades > 0 ? d.fat / d.unidades : 0;
  const receitaVisita = d.fat / d.visitas;
  const topo = Math.max(1, etapas[0].valor);
  const larg = (i: number) => Math.max(42, Math.sqrt(Math.min(1, etapas[i].valor / topo)) * 100);

  return (
    <section aria-label="Funil de conversão" className="ds-kpi rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="ds-rotulo !normal-case !tracking-[0.12em]">
          4 · Funil de conversão{periodo ? ` · ${periodo}` : ""}
        </h2>
        <TooltipInfo text="Visitas e PDP são dados reais (no ML a visita é a abertura da PDP). Add to cart e checkout são estimativas geométricas entre PDP e pedidos — não vêm da base. Pedidos = unidades (TSI)." />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col items-center gap-1.5" role="img" aria-label="Funil de cinco etapas">
          {etapas.map((e, i) => {
            const w = larg(i);
            const prox = i < etapas.length - 1 ? larg(i + 1) : w * 0.9;
            const recuo = ((w - prox) / 2 / w) * 100;
            const daAnterior = i > 0 && etapas[i - 1].valor > 0 ? e.valor / etapas[i - 1].valor : 1;
            const eMaiorDrop =
              maiorAbandono != null &&
              i > 0 &&
              maiorAbandono.de === etapas[i - 1].nome &&
              maiorAbandono.para === e.nome;

            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.28 }}
                title={`${e.nome}: ${num(e.valor)}${e.fonte === "estimativa" ? " (estimativa)" : ""}`}
                className="group relative flex min-h-[72px] flex-col items-center justify-center gap-0.5 py-2.5 text-center"
                style={{ width: `${w}%`, paddingInline: `calc(${recuo}% + 10px)` }}
              >
                <div
                  className={`absolute inset-0 border transition-colors duration-150 ${
                    eMaiorDrop
                      ? "border-amber-400/70 bg-gradient-to-b from-amber-100 to-amber-50/80"
                      : "border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90"
                  }`}
                  style={{
                    clipPath: `polygon(0 0, 100% 0, ${100 - recuo}% 100%, ${recuo}% 100%)`,
                    borderRadius: "14px 14px 22px 22px",
                  }}
                />
                <div className="relative flex max-w-full items-center gap-1.5">
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{e.nome}</p>
                  {e.fonte === "estimativa" && (
                    <span className="shrink-0 rounded bg-slate-200/80 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-slate-600">
                      estimativa
                    </span>
                  )}
                </div>
                <p className="relative max-w-full truncate text-xl font-semibold tabular-nums font-mono leading-tight text-slate-900">
                  <NumeroAnimado valor={num(e.valor)} />
                </p>
                {e.nota && <p className="relative max-w-full truncate text-[10px] text-slate-400">{e.nota}</p>}
                {i > 0 && (
                  <p className={`relative max-w-full truncate text-[10px] leading-tight tabular-nums font-mono ${eMaiorDrop ? "text-amber-700 font-medium" : "text-slate-500"}`}>
                    {pct(daAnterior * 100, 2)} da etapa anterior
                    {eMaiorDrop ? " · maior abandono" : ""}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Conversão final</p>
            <p className="text-3xl font-semibold tabular-nums font-mono tracking-tight text-slate-900">
              <NumeroAnimado valor={cvr != null ? pct(cvr * 100, 2) : "—"} />
            </p>
            <p className="text-[11px] text-slate-500">
              unidades ÷ visitas
              {cvr != null ? ` · a cada 100 visitas, ${num(cvr * 100, 1)} unidades` : ""}
            </p>
          </div>

          {maiorAbandono && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3.5 text-xs">
              <p className="font-medium text-amber-900">Maior abandono</p>
              <p className="mt-0.5 text-amber-800/90">
                {maiorAbandono.de} → {maiorAbandono.para}
              </p>
              <p className="mt-1 tabular-nums font-mono text-amber-900">
                {pct(maiorAbandono.taxa * 100, 1)} de queda · {num(maiorAbandono.perdidos)} não avançaram
              </p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Faturamento", brl(d.fat)],
              ["Ticket / unidade", brl(ticket, true)],
              ["Receita / visita", brl(receitaVisita, true)],
              ["BPC médio", d.bpcMedio != null ? num(d.bpcMedio, 2) : "Sem dado"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200/80 bg-white p-2.5 transition-colors duration-150 hover:border-slate-300">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="font-medium tabular-nums font-mono text-slate-800">
                  <NumeroAnimado valor={String(v)} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
