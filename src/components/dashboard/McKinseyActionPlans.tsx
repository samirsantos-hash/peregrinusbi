import { useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Rocket, Search, AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { fmtBRL, fmtBRLCompact, fmtNum, fmtNumCompact } from "@/utils/formatters";
import { toast } from "sonner";

interface DatePoint {
  name: string; // date
  forcaCompetitiva: number;
  atratividade: number;
  gapPct: number;
  gmv: number;
}

interface KpiRow {
  date: string;
  gmv: number;
  visits: number;
  visitsExpensive: number;
  visitsMatch: number;
  visitsCheaper: number;
  scorePhoto: number;
  scoreTitle: number;
  scoreQualidade: number;
  roas: number;
  minPriceRival: number;
  tsi: number;
  adsInvestment: number;
  upliftGmvM1: number;
  repLevel: string;
}

interface Props {
  scatterData: DatePoint[];
  medianX: number;
  medianY: number;
  kpis: KpiRow[];
  sellerName?: string;
}

type Quadrant = "invest" | "seo" | "critical" | "maintain";

function classifyQuadrant(x: number, y: number, mx: number, my: number): Quadrant {
  if (x >= mx && y >= my) return "invest";
  if (x >= mx && y < my) return "seo";
  if (x < mx && y < my) return "critical";
  return "maintain";
}

const McKinseyActionPlans = ({ scatterData, medianX, medianY, kpis, sellerName = "Seller" }: Props) => {
  // Build enriched rows by joining scatter points with KPI data per date
  const enrichedRows = useMemo(() => {
    const kpiByDate: Record<string, KpiRow> = {};
    for (const k of kpis) {
      // Aggregate per date (take last seen or sum)
      if (!kpiByDate[k.date]) {
        kpiByDate[k.date] = { ...k };
      } else {
        const e = kpiByDate[k.date];
        e.gmv += k.gmv;
        e.visits += k.visits;
        e.visitsExpensive += k.visitsExpensive;
        e.visitsMatch += k.visitsMatch;
        e.visitsCheaper += k.visitsCheaper;
        e.tsi += k.tsi;
        e.adsInvestment += k.adsInvestment;
      }
    }

    return scatterData.map((p) => {
      const kpi = kpiByDate[p.name];
      const quadrant = classifyQuadrant(p.forcaCompetitiva, p.atratividade, medianX, medianY);
      return {
        date: p.name,
        quadrant,
        forcaCompetitiva: p.forcaCompetitiva,
        atratividade: p.atratividade,
        gapPct: p.gapPct,
        gmv: p.gmv,
        visits: kpi?.visits ?? 0,
        scoreTitle: kpi?.scoreTitle ?? 0,
        scorePhoto: kpi?.scorePhoto ?? 0,
        scoreQualidade: kpi?.scoreQualidade ?? 0,
        roas: kpi?.roas ?? 0,
        tsi: kpi?.tsi ?? 0,
        adsInvestment: kpi?.adsInvestment ?? 0,
        upliftGmvM1: kpi?.upliftGmvM1 ?? 0,
        minPriceRival: kpi?.minPriceRival ?? 0,
      };
    }).sort((a, b) => b.gmv - a.gmv);
  }, [scatterData, kpis, medianX, medianY]);

  const investRows = enrichedRows.filter((r) => r.quadrant === "invest");
  const seoRows = enrichedRows.filter((r) => r.quadrant === "seo");
  const criticalRows = enrichedRows.filter((r) => r.quadrant === "critical");

  const copyToWhatsApp = (title: string, rows: typeof enrichedRows, type: "invest" | "seo" | "critical") => {
    let text = `📊 *${title}*\n_Seller: ${sellerName}_\n\n`;

    if (type === "invest") {
      rows.forEach((r, i) => {
        text += `${i + 1}. *${r.date}*\n   💰 GMV: ${fmtBRLCompact(r.gmv)} | ROAS: ${fmtNum(r.roas, 1)} | Gap: ${fmtNum(r.gapPct, 1)}%\n`;
      });
      text += `\n💡 _Estes períodos são seus campeões. Aumente o orçamento de Ads e garanta reposição de estoque imediata._`;
    } else if (type === "seo") {
      rows.forEach((r, i) => {
        text += `${i + 1}. *${r.date}*\n   👁 Visitas: ${fmtNumCompact(r.visits)} | Título: ${fmtNum(r.scoreTitle, 0)} | Fotos: ${fmtNum(r.scorePhoto, 0)}\n`;
      });
      text += `\n💡 _Você tem o produto e o preço, mas o cliente não te encontra. Melhore o título e as palavras-chave (SEO)._`;
    } else {
      rows.forEach((r, i) => {
        text += `${i + 1}. *${r.date}*\n   📦 Itens Vendidos: ${r.tsi} | Força: ${fmtNum(r.forcaCompetitiva, 1)} | Atratividade: ${fmtNumCompact(r.atratividade)}\n`;
      });
      text += `\n💡 _Estes períodos não possuem tração. Considere uma queima de estoque para recuperar capital._`;
    }

    navigator.clipboard.writeText(text);
    toast.success("Lista copiada para a área de transferência!");
  };

  if (investRows.length === 0 && seoRows.length === 0 && criticalRows.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Planos de Ação por Segmento de Portfólio
        </h3>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {/* 🚀 Prioridade Máxima */}
        {investRows.length > 0 && (
          <AccordionItem value="invest" className="border border-emerald/20 rounded-lg bg-emerald/5 px-1">
            <AccordionTrigger className="hover:no-underline px-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Rocket className="w-4 h-4 text-emerald" />
                <span className="text-emerald">🚀 Prioridade Máxima: Investir e Escalar</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">({investRows.length} período{investRows.length > 1 ? "s" : ""})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <p className="text-xs text-emerald/80 mb-3 italic">
                💡 Estes períodos são seus campeões. Aumente o orçamento de Ads e garanta reposição de estoque imediata.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald/20">
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Período</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">GMV</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">ROAS</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Gap de Preço</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Força</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Atratividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investRows.map((r, idx) => (
                      <motion.tr key={r.date} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-emerald/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium">{r.date}</td>
                        <td className="text-right py-2 px-3 font-mono text-emerald font-semibold">{fmtBRLCompact(r.gmv)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.roas, 1)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.gapPct, 1)}%</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.forcaCompetitiva, 1)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNumCompact(r.atratividade)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" className="gap-2 text-xs border-emerald/30 text-emerald hover:bg-emerald/10" onClick={() => copyToWhatsApp("Prioridade Máxima: Investir e Escalar", investRows, "invest")}>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar para WhatsApp
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 🔍 Ajuste de SEO */}
        {seoRows.length > 0 && (
          <AccordionItem value="seo" className="border border-amber-500/20 rounded-lg bg-amber-500/5 px-1">
            <AccordionTrigger className="hover:no-underline px-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Search className="w-4 h-4 text-amber-500" />
                <span className="text-amber-500">🔍 Ajuste de SEO: Melhorar Atratividade</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">({seoRows.length} período{seoRows.length > 1 ? "s" : ""})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <p className="text-xs text-amber-500/80 mb-3 italic">
                💡 Você tem o produto e o preço, mas o cliente não te encontra. Melhore o título e as palavras-chave (SEO).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-500/20">
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Período</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Visitas</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Título</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Fotos</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Força</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Atratividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seoRows.map((r, idx) => (
                      <motion.tr key={r.date} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-amber-500/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium">{r.date}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNumCompact(r.visits)}</td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.scoreTitle < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.scoreTitle, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.scorePhoto < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.scorePhoto, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.forcaCompetitiva, 1)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNumCompact(r.atratividade)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" className="gap-2 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => copyToWhatsApp("Ajuste de SEO: Melhorar Atratividade", seoRows, "seo")}>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar para WhatsApp
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ⚠️ Crítico */}
        {criticalRows.length > 0 && (
          <AccordionItem value="critical" className="border border-destructive/20 rounded-lg bg-destructive/5 px-1">
            <AccordionTrigger className="hover:no-underline px-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-destructive">⚠️ Crítico: Descontinuar ou Liquidar</span>
                <span className="ml-2 text-xs font-normal text-muted-foreground">({criticalRows.length} período{criticalRows.length > 1 ? "s" : ""})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <p className="text-xs text-destructive/80 mb-3 italic">
                💡 Estes períodos estão ocupando espaço e não possuem tração. Considere uma queima de estoque para recuperar capital.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-destructive/20">
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Período</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">GMV</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Itens Vendidos</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Qualidade</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Força</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Atratividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalRows.map((r, idx) => (
                      <motion.tr key={r.date} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-destructive/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium">{r.date}</td>
                        <td className="text-right py-2 px-3 font-mono text-destructive">{fmtBRLCompact(r.gmv)}</td>
                        <td className="text-right py-2 px-3 font-mono">{r.tsi}</td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.scoreQualidade < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.scoreQualidade, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.forcaCompetitiva, 1)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNumCompact(r.atratividade)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" size="sm" className="gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => copyToWhatsApp("Crítico: Descontinuar ou Liquidar", criticalRows, "critical")}>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar para WhatsApp
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};

export default McKinseyActionPlans;
