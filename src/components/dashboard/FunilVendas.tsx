import { useMemo } from "react";
import { motion } from "framer-motion";
import { brl, num, pct } from "@/lib/format";
import TooltipInfo from "./TooltipInfo";

interface KpiFunil {
  visits: number;
  visitsMatch: number;
  visitsCheaper: number;
  tsi: number;
  gmv: number;
  tgmv?: number;
}

const CORES = ["34 211 238", "56 189 248", "45 212 191", "16 185 129"];

/** Funil de vendas do período: visitas → visitas com preço competitivo → unidades vendidas. */
export default function FunilVendas({ kpis }: { kpis: KpiFunil[] }) {
  const d = useMemo(() => {
    const s = (f: (k: KpiFunil) => number) => kpis.reduce((a, k) => a + (Number(f(k)) || 0), 0);
    const visitas = s((k) => k.visits);
    const competitivas = s((k) => (k.visitsMatch || 0) + (k.visitsCheaper || 0));
    const unidades = s((k) => k.tsi);
    const fat = s((k) => k.tgmv || k.gmv);
    return { visitas, competitivas, unidades, fat };
  }, [kpis]);

  if (d.visitas <= 0) {
    return (
      <div className="glass-card p-5 text-xs text-muted-foreground">
        Funil de vendas: sem visitas registradas no período — carregue a base de visitas para ver a conversão.
      </div>
    );
  }

  const etapas = [
    { nome: "Visitas", valor: d.visitas, fmt: num(d.visitas) },
    ...(d.competitivas > 0 && d.competitivas <= d.visitas
      ? [{ nome: "Visitas com preço competitivo", valor: d.competitivas, fmt: num(d.competitivas) }]
      : []),
    { nome: "Unidades vendidas", valor: d.unidades, fmt: num(d.unidades) },
  ];
  const conversao = d.unidades / d.visitas;
  const ticket = d.unidades > 0 ? d.fat / d.unidades : 0;
  const receitaVisita = d.fat / d.visitas;

  const W = 600, H = 70 * etapas.length;
  const larg = (i: number) => {
    const r = etapas[i].valor / d.visitas;
    return Math.max(0.18, Math.sqrt(Math.min(1, r))) * W;
  };

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Funil de vendas</h3>
        <TooltipInfo text="Soma do período selecionado. Cada etapa mostra quantos seguiram da etapa anterior e do total de visitas. A largura usa escala de raiz para que as etapas pequenas continuem visíveis." />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Funil de vendas">
            {etapas.map((e, i) => {
              const top = larg(i);
              const bot = i < etapas.length - 1 ? larg(i + 1) : top * 0.85;
              const y = i * 70;
              const pts = `${(W - top) / 2},${y} ${(W + top) / 2},${y} ${(W + bot) / 2},${y + 62} ${(W - bot) / 2},${y + 62}`;
              const daAnterior = i > 0 ? e.valor / etapas[i - 1].valor : 1;
              return (
                <motion.g key={e.nome} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className="cursor-default [&:hover>polygon]:brightness-125">
                  <title>{`${e.nome}: ${e.fmt} · ${pct(e.valor / d.visitas * 100, 2)} das visitas`}</title>
                  <polygon points={pts} fill={`rgb(${CORES[i % CORES.length]} / 0.85)`} stroke="rgb(255 255 255 / 0.25)" strokeWidth={1} />
                  <text x={W / 2} y={y + 27} textAnchor="middle" fontSize={13} fontWeight={600} fill="hsl(var(--background))">{e.nome}</text>
                  <text x={W / 2} y={y + 46} textAnchor="middle" fontSize={14} fontWeight={700} fill="hsl(var(--background))" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {e.fmt}{i > 0 ? ` · ${pct(daAnterior * 100, 2)} da etapa anterior` : ""}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Conversão (unidades ÷ visitas)</p>
            <p className="text-3xl font-medium tabular-nums text-foreground">{pct(conversao * 100, 2)}</p>
            <p className="text-[11px] text-muted-foreground">a cada 100 visitas, {num(conversao * 100, 1)} unidades vendidas</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Faturamento", brl(d.fat)],
              ["Ticket por unidade", brl(ticket, true)],
              ["Receita por visita", brl(receitaVisita, true)],
              ["Visitas sem compra", num(Math.max(0, d.visitas - d.unidades))],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-primary/40">
                <dt className="text-[11px] text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
