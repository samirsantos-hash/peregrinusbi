import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link2, ArrowRight } from "lucide-react";
import { pearson, strengthLabel } from "@/lib/correlacao";
import { cn } from "@/lib/utils";

type Kpi = Record<string, any>;

type Props = {
  kpis: Kpi[];
};

const PARES: Array<{ a: string; b: string; xKey: string; yKey: string; sentido: "↑" | "↓"; comentario: string }> = [
  { a: "Full %",              b: "GMV",           xKey: "shareFullPct",   yKey: "gmv",           sentido: "↑", comentario: "Quanto mais Full, mais o algoritmo empurra o anúncio." },
  { a: "CDP (TGMV via CDP)",  b: "GMV",           xKey: "cdpTgmv",        yKey: "gmv",           sentido: "↑", comentario: "Central de Promoção amplia o tráfego orgânico." },
  { a: "IPI",                 b: "ROAS",          xKey: "pontuacaoIpi",   yKey: "roas",          sentido: "↑", comentario: "Anúncios de qualidade convertem melhor o Ads." },
  { a: "% Não Competitivo",   b: "Conversão",     xKey: "pctNaoCompetitivo", yKey: "convRate",   sentido: "↓", comentario: "Preço alto reduz conversão e penaliza ranking." },
  { a: "Taxa de Atraso",      b: "Conversão",     xKey: "taxaAtrasos",    yKey: "convRate",      sentido: "↓", comentario: "Atrasos derrubam Shipping Score e a conversão." },
];

export function CorrelacaoPanel({ kpis }: Props) {
  const linhas = useMemo(() => {
    return PARES.map((p) => {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const k of kpis) {
        const x = Number(k?.[p.xKey]);
        const y = Number(k?.[p.yKey]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          xs.push(x); ys.push(y);
        }
      }
      const r = pearson(xs, ys);
      return { ...p, r, n: xs.length };
    });
  }, [kpis]);

  const maisForte = useMemo(() => {
    const ord = [...linhas].filter(l => l.n >= 3).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    return ord[0];
  }, [linhas]);

  const toneClass = (t: "muted" | "warning" | "emerald" | "destructive") =>
    t === "muted" ? "text-muted-foreground bg-muted/30 border-border"
    : t === "warning" ? "text-warning bg-warning/10 border-warning/30"
    : t === "emerald" ? "text-emerald bg-emerald/10 border-emerald/30"
    : "text-destructive bg-destructive/10 border-destructive/30";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-neon-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Como os KPIs se influenciam</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Fluxo simplificado dos principais drivers do algoritmo do Mercado Livre.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-[11px]">
          {[
            { l: "📦 Full %",        sub: "CRÍTICO" },
            { l: "🎯 CDP Opt-in",    sub: "CRÍTICO" },
            { l: "⭐ IPI",           sub: "ESSENCIAL" },
            { l: "💰 Preço Comp.",   sub: "IMPORTANTE" },
            { l: "🛡 Reputação Verde", sub: "ESSENCIAL" },
          ].map((it) => (
            <div key={it.l} className="rounded-lg border border-neon-blue/20 bg-neon-blue/[0.04] p-3 text-center">
              <p className="font-semibold text-foreground">{it.l}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{it.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 my-4 text-xs text-muted-foreground">
          <span>👆 CTR</span><ArrowRight className="w-3 h-3" />
          <span>🛒 Conversão</span><ArrowRight className="w-3 h-3" />
          <span>💹 GMV</span><ArrowRight className="w-3 h-3" />
          <span>🔝 Posição Orgânica</span>
          <ArrowRight className="w-3 h-3 rotate-180" />
          <span className="italic">(retroalimenta CTR)</span>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-1">Correlações observadas (Pearson)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Calculadas sobre o período carregado deste seller. |r| &lt; 0.3 é considerado fraco.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 pr-3">Se este KPI sobe →</th>
                <th className="text-left py-2 pr-3">Tende a:</th>
                <th className="text-right py-2 pr-3">Pearson</th>
                <th className="text-left py-2 pr-3">Força</th>
                <th className="text-left py-2">Leitura</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const s = strengthLabel(l.r);
                return (
                  <tr key={l.xKey + l.yKey} className="border-b border-border/40">
                    <td className="py-2 pr-3 text-foreground">{l.a}</td>
                    <td className="py-2 pr-3 text-foreground">
                      {l.b} {l.sentido}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {l.n < 3 ? "—" : l.r.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn("inline-block text-[10px] font-semibold border rounded px-1.5 py-0.5", toneClass(s.tone))}>
                        {l.n < 3 ? "Sem dados" : s.label}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{l.comentario}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {maisForte && Math.abs(maisForte.r) >= 0.3 && (
          <div className="mt-4 p-3 rounded-md border border-neon-blue/30 bg-neon-blue/[0.06] text-xs">
            <span className="font-semibold text-neon-blue">Insight: </span>
            Para este seller, o fator que mais se correlaciona com {maisForte.b.toLowerCase()} no período é{" "}
            <span className="font-semibold">{maisForte.a}</span> (Pearson {maisForte.r.toFixed(2)}). Foco aqui para maior impacto.
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CorrelacaoPanel;