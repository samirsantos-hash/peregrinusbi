import { useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Rocket, Search, AlertTriangle, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { fmtNum } from "@/utils/formatters";
import { toast } from "sonner";
import { type ListingQuality } from "@/hooks/useListingsQuality";

interface Props {
  listingsQuality: ListingQuality[];
  sellerName?: string;
}

type Quadrant = "invest" | "seo" | "critical" | "maintain";

function classifyItem(item: ListingQuality): Quadrant {
  // Força Competitiva = avg of offer scores (price, stock, shipping, promotions)
  const offerScores = [item.llPriceScore, item.llStockAvailabilityScore, item.llFreeShippingScore, item.llPromotionsScore].filter(s => s > 0);
  const forcaCompetitiva = offerScores.length > 0 ? offerScores.reduce((a, b) => a + b, 0) / offerScores.length : 50;

  // Atratividade = avg of content scores (pictures, title, description, tech specs)
  const contentScores = [item.llPicturesScore, item.llTitleScore, item.llDescriptionScore, item.llTechSpecsScore].filter(s => s > 0);
  const atratividade = contentScores.length > 0 ? contentScores.reduce((a, b) => a + b, 0) / contentScores.length : 50;

  const threshold = 65;
  if (forcaCompetitiva >= threshold && atratividade >= threshold) return "invest";
  if (forcaCompetitiva >= threshold && atratividade < threshold) return "seo";
  if (forcaCompetitiva < threshold && atratividade < threshold) return "critical";
  return "maintain";
}

function buildMlbLink(itemId: string): string {
  const clean = itemId.replace(/\D/g, "");
  return `https://produto.mercadolivre.com.br/MLB-${clean}`;
}

const McKinseyActionPlans = ({ listingsQuality, sellerName = "Seller" }: Props) => {
  const classifiedItems = useMemo(() => {
    return listingsQuality.map((item) => ({
      ...item,
      quadrant: classifyItem(item),
      mlbUrl: buildMlbLink(item.itemId),
    })).sort((a, b) => b.tgmvLcClips - a.tgmvLcClips);
  }, [listingsQuality]);

  const investRows = classifiedItems.filter((r) => r.quadrant === "invest");
  const seoRows = classifiedItems.filter((r) => r.quadrant === "seo");
  const criticalRows = classifiedItems.filter((r) => r.quadrant === "critical");

  const copyToWhatsApp = (title: string, rows: typeof classifiedItems, type: "invest" | "seo" | "critical") => {
    let text = `📊 *${title}*\n_Seller: ${sellerName}_\n\n`;

    rows.forEach((r, i) => {
      const link = r.mlbUrl;
      if (type === "invest") {
        text += `${i + 1}. *${r.itemId}*\n   🏆 Score: ${fmtNum(r.avgScore, 0)} | Oferta: ${fmtNum(r.scoreOfertaFinal, 0)}\n   🔗 ${link}\n`;
      } else if (type === "seo") {
        text += `${i + 1}. *${r.itemId}*\n   📸 Fotos: ${fmtNum(r.scorePhoto, 0)} | 📝 Título: ${fmtNum(r.scoreTitle, 0)} | Problemas: ${r.issues.length > 0 ? r.issues.join(", ") : "Nenhum"}\n   🔗 ${link}\n`;
      } else {
        text += `${i + 1}. *${r.itemId}*\n   ⚠️ Score: ${fmtNum(r.avgScore, 0)} | Problemas: ${r.issues.length > 0 ? r.issues.join(", ") : "Nenhum"}\n   🔗 ${link}\n`;
      }
    });

    if (type === "invest") text += `\n💡 _Estes itens são seus campeões. Aumente o orçamento de Ads e garanta reposição de estoque imediata._`;
    else if (type === "seo") text += `\n💡 _Você tem o produto e o preço, mas o cliente não te encontra. Melhore o título e as palavras-chave (SEO)._`;
    else text += `\n💡 _Estes itens estão ocupando espaço e não possuem tração. Considere uma queima de estoque para recuperar capital._`;

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
                <span className="ml-2 text-xs font-normal text-muted-foreground">({investRows.length} item{investRows.length > 1 ? "s" : ""})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <p className="text-xs text-emerald/80 mb-3 italic">
                💡 Estes itens são seus campeões. Aumente o orçamento de Ads e garanta reposição de estoque imediata.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald/20">
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Item ID</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Geral</th>
                       <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Oferta</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Fotos</th>
                      <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ver Anúncio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investRows.map((r, idx) => (
                      <motion.tr key={r.itemId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-emerald/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-xs">{r.itemId}</td>
                        <td className="text-right py-2 px-3 font-mono text-emerald font-semibold">{fmtNum(r.avgScore, 0)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.scoreQualidadeFinal, 0)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.scoreOfertaFinal, 0)}</td>
                        <td className="text-right py-2 px-3 font-mono">{fmtNum(r.scorePhoto, 0)}</td>
                        <td className="text-center py-2 px-3">
                          <a href={r.mlbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-blue-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
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
                <span className="ml-2 text-xs font-normal text-muted-foreground">({seoRows.length} item{seoRows.length > 1 ? "s" : ""})</span>
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
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Item ID</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Título</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Fotos</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Descrição</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ficha Técnica</th>
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Problemas</th>
                      <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ver Anúncio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seoRows.map((r, idx) => (
                      <motion.tr key={r.itemId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-amber-500/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-xs">{r.itemId}</td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.llTitleScore < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.llTitleScore, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.llPicturesScore < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.llPicturesScore, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.llDescriptionScore < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.llDescriptionScore, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.llTechSpecsScore < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.llTechSpecsScore, 0)}</span>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{r.issues.join(", ") || "—"}</td>
                        <td className="text-center py-2 px-3">
                          <a href={r.mlbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-blue-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
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
                <span className="ml-2 text-xs font-normal text-muted-foreground">({criticalRows.length} item{criticalRows.length > 1 ? "s" : ""})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <p className="text-xs text-destructive/80 mb-3 italic">
                💡 Estes itens estão ocupando espaço e não possuem tração. Considere uma queima de estoque para recuperar capital.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-destructive/20">
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Item ID</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Score Geral</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Qualidade</th>
                      <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preço</th>
                      <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Problemas</th>
                      <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ver Anúncio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalRows.map((r, idx) => (
                      <motion.tr key={r.itemId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-destructive/5 transition-colors">
                        <td className="py-2 px-3 font-mono font-medium text-xs">{r.itemId}</td>
                        <td className="text-right py-2 px-3 font-mono text-destructive font-semibold">{fmtNum(r.avgScore, 0)}</td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.scoreQualidadeFinal < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.scoreQualidadeFinal, 0)}</span>
                        </td>
                        <td className="text-right py-2 px-3 font-mono">
                          <span className={r.llPriceScore < 70 ? "text-destructive" : "text-emerald"}>{fmtNum(r.llPriceScore, 0)}</span>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{r.issues.join(", ") || "—"}</td>
                        <td className="text-center py-2 px-3">
                          <a href={r.mlbUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:text-blue-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
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
