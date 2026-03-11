import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tag, AlertTriangle, TrendingUp, Package, Filter, Download,
  ExternalLink, Copy, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TooltipInfo from "./TooltipInfo";
import { fmtNum } from "@/utils/formatters";
import { type EligibilityItem } from "@/hooks/useEligibility";

interface OpportunitiesPanelProps {
  items: EligibilityItem[];
}

const getActionBadge = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes("optin") || lower.includes("s/ optin"))
    return { className: "bg-warning/15 text-warning border-warning/30", label: action || "Item s/ Optin" };
  if (lower.includes("desconto") || lower.includes("atrativo"))
    return { className: "bg-neon-blue/15 text-neon-blue border-neon-blue/30", label: action };
  if (lower.includes("campanha"))
    return { className: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: action };
  return { className: "bg-muted/30 text-muted-foreground border-border", label: action || "—" };
};

const OpportunitiesPanel = ({ items }: OpportunitiesPanelProps) => {
  const [bestPromoOnly, setBestPromoOnly] = useState(false);
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const verticals = useMemo(() => {
    const set = new Set(items.map((i) => i.verticalItem).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (bestPromoOnly) result = result.filter((i) => i.flagBestPromo);
    if (verticalFilter !== "all") result = result.filter((i) => i.verticalItem === verticalFilter);
    return result;
  }, [items, bestPromoOnly, verticalFilter]);

  // Summary metrics
  const totalEligible = items.length;
  const bestDiscount = items.length > 0 ? Math.max(...items.map((i) => i.discountBest)) : 0;
  const itemsSemOptin = items.filter((i) => i.flagItemSOptin).length;
  const bestPromoCount = items.filter((i) => i.flagBestPromo).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const exportSelected = () => {
    const selectedItems = filtered.filter((i) => selectedIds.has(i.id));
    const csvLines = ["CAMPAIGN_ID_BEST;ITEM_ID"];
    selectedItems.forEach((i) => csvLines.push(`${i.campaignIdBest};${i.itemId}`));
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optin_massa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyItemIds = () => {
    const ids = filtered.map((i) => i.itemId).join(", ");
    navigator.clipboard.writeText(ids);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
        <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum dado de elegibilidade encontrado para este seller.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Importe o arquivo <code className="bg-muted px-1 py-0.5 rounded text-[10px]">SFTP_ECOMCONSULT_ELEGIBILIDADE</code> na área Admin.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Itens Elegíveis", value: totalEligible.toLocaleString("pt-BR"), icon: Package, color: "neon-text", tooltip: "Contagem total de itens elegíveis para ofertas." },
          { label: "Melhor Desconto", value: `${fmtNum(bestDiscount / 10, 1)}%`, icon: Tag, color: "text-emerald", tooltip: "Maior desconto disponível (DISCOUNT_BEST)." },
          { label: "Itens sem Optin", value: itemsSemOptin.toLocaleString("pt-BR"), icon: AlertTriangle, color: "text-warning", tooltip: "Itens onde FLAG_ITEM_S_OPTIN é True — oportunidade de ativação." },
          { label: "Quick Wins (Best Promo)", value: bestPromoCount.toLocaleString("pt-BR"), icon: TrendingUp, color: "text-neon-blue", tooltip: "Itens com FLAG_BEST_PROMO = True. Quick wins para sugerir ao seller." },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="metric-label">{m.label}</p>
              <TooltipInfo text={m.tooltip} />
            </div>
            <p className={`metric-value ${m.color}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Filtros</span>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={bestPromoOnly} onCheckedChange={setBestPromoOnly} />
            <span className="text-xs text-muted-foreground">Apenas Best Promo</span>
          </div>

          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-card/60 border-border">
              <SelectValue placeholder="Todas Verticais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Verticais</SelectItem>
              {verticals.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyItemIds} className="gap-1.5 text-xs">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar IDs"}
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={exportSelected} className="gap-1.5 text-xs bg-neon-blue/10 text-neon-blue border-neon-blue/30 hover:bg-neon-blue/20">
                <Download className="w-3.5 h-3.5" />
                Exportar Optin ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Tabela Dinâmica de Itens Elegíveis
          </h3>
          <TooltipInfo text="Lista de produtos com oportunidades de oferta. Selecione itens para exportar e realizar Optin em massa." />
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} itens</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={selectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Produto</th>
                <th className="text-center py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ação Recomendada</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Estoque 7D</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Full 7D</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Vendas 7D</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Desc. Total</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Desc. Best</th>
                <th className="text-right py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Ganho</th>
                <th className="text-center py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Vertical</th>
                <th className="text-center py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">Alerta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const badge = getActionBadge(item.acaoRecomendada);
                const noFull = item.estoqueMedioFull7d === 0 || !item.estoqueMedioFull7d;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="py-2 px-2 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        {item.mlbLink ? (
                          <a
                            href={item.mlbLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4DD0E1] hover:underline truncate font-medium text-xs flex items-center gap-1"
                          >
                            {item.itemName || item.itemId}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="truncate text-xs">{item.itemName || item.itemId}</span>
                        )}
                        {item.flagBestPromo && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald/10 text-emerald border-emerald/30 flex-shrink-0">
                            BEST
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs">
                      {item.estoqueMedio7d.toLocaleString("pt-BR")}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs">
                      {noFull ? (
                        <span className="text-warning text-[10px]">⚡ Enviar Full</span>
                      ) : (
                        item.estoqueMedioFull7d.toLocaleString("pt-BR")
                      )}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs font-medium">
                      {item.pedidos7d.toLocaleString("pt-BR")}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs">
                      {fmtNum(item.discountTotal / 10, 1)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs text-emerald">
                      {fmtNum(item.discountBest / 10, 1)}%
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-xs">
                      {item.gainAttractiveness > 0 ? (
                        <span className="text-emerald">+{fmtNum(item.gainAttractiveness / 10, 1)}pp</span>
                      ) : item.gainAttractiveness < 0 ? (
                        <span className="text-destructive">{fmtNum(item.gainAttractiveness / 10, 1)}pp</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2 text-xs text-muted-foreground">
                      {item.verticalItem || "—"}
                    </td>
                    <td className="text-center py-2 px-2 text-xs">
                      {item.alert ? (
                        <span className={`text-[10px] ${item.alert.includes("Ruptura") ? "text-destructive" : "text-warning"}`}>
                          {item.alert}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum item encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default OpportunitiesPanel;
