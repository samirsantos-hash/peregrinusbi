import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import SellerLink from "./SellerLink";
import { fmtBRL, fmtNum } from "@/utils/formatters";

interface KpiLike {
  date: string;
  minPriceRival: number;
  gmv: number;
  productName: string;
  productId: string;
}

interface Props {
  kpis: KpiLike[];
  sellerCustIdMap?: Record<string, string>;
}

interface PriceMovement {
  name: string;
  productId: string;
  previousPrice: number;
  currentPrice: number;
  variationPct: number;
  direction: "up" | "down";
}

const PriceAuditTable = ({ kpis, sellerCustIdMap = {} }: Props) => {
  const movements = useMemo(() => {
    const dates = [...new Set(kpis.map((k) => k.date))].sort();
    if (dates.length < 2) return [];

    const latestDate = dates[dates.length - 1];
    const previousDate = dates[dates.length - 2];

    // Group by productId for each date
    const byProduct: Record<string, { prev: number[]; curr: number[] }> = {};
    for (const k of kpis) {
      if (k.minPriceRival <= 0) continue;
      if (!byProduct[k.productId]) byProduct[k.productId] = { prev: [], curr: [] };
      if (k.date === previousDate) byProduct[k.productId].prev.push(k.minPriceRival);
      if (k.date === latestDate) byProduct[k.productId].curr.push(k.minPriceRival);
    }

    const result: PriceMovement[] = [];
    for (const [pid, data] of Object.entries(byProduct)) {
      if (data.prev.length === 0 || data.curr.length === 0) continue;
      const avgPrev = data.prev.reduce((a, b) => a + b, 0) / data.prev.length;
      const avgCurr = data.curr.reduce((a, b) => a + b, 0) / data.curr.length;
      if (avgPrev === 0) continue;

      const pct = ((avgCurr - avgPrev) / avgPrev) * 100;
      if (Math.abs(pct) < 5) continue;

      const name = kpis.find((k) => k.productId === pid)?.productName || pid;
      result.push({
        name,
        productId: pid,
        previousPrice: avgPrev,
        currentPrice: avgCurr,
        variationPct: pct,
        direction: pct > 0 ? "up" : "down",
      });
    }

    return result.sort((a, b) => Math.abs(b.variationPct) - Math.abs(a.variationPct));
  }, [kpis]);

  if (movements.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Movimentações Recentes de Preço (≥5%)
        </h3>
        <TooltipInfo text="Compara o preço rival do último upload com o anterior. Exibe apenas anúncios com variação ≥ 5% para cima ou para baixo." />
        <span className="status-badge text-[11px] bg-accent/10 text-accent-foreground border-border/30 ml-auto">
          {movements.length} alterações
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Usuário / Loja</th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preço Anterior</th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Preço Atual</th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Variação</th>
              <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Direção</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m, idx) => (
              <motion.tr
                key={m.productId + idx}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                <td className="py-2.5 px-3">
                  <SellerLink name={m.name} custId={sellerCustIdMap[m.productId]} className="font-medium text-sm" />
                </td>
                <td className="text-right py-2.5 px-3 font-mono text-muted-foreground">{fmtBRL(m.previousPrice)}</td>
                <td className="text-right py-2.5 px-3 font-mono font-semibold text-foreground">{fmtBRL(m.currentPrice)}</td>
                <td className={`text-right py-2.5 px-3 font-mono font-semibold ${m.direction === "up" ? "text-destructive" : "text-emerald"}`}>
                  {m.direction === "up" ? "+" : ""}{fmtNum(m.variationPct, 1)}%
                </td>
                <td className="text-center py-2.5 px-3">
                  {m.direction === "up" ? (
                    <span className="inline-flex items-center gap-1 status-badge text-[11px] bg-destructive/10 text-destructive border-destructive/20">
                      <ArrowUpRight className="w-3 h-3" /> Aumento
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 status-badge text-[11px] bg-emerald/10 text-emerald border-emerald/20">
                      <ArrowDownRight className="w-3 h-3" /> Queda
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceAuditTable;
