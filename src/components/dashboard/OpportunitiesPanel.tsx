import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Tag, AlertTriangle, TrendingUp, Package, Filter, Download,
  ExternalLink, Copy, CheckCircle, Search, Star, ArrowUpDown,
  ArrowDown, ArrowUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TooltipInfo from "./TooltipInfo";
import { type EligibilityItem } from "@/hooks/useEligibility";
import { linhaCsvSegura } from "@/lib/csvSafe";

interface OpportunitiesPanelProps {
  items: EligibilityItem[];
}

// Campaign type abbreviation map
const CAMPAIGN_TYPE_MAP: Record<string, string> = {
  "SMART_COFINANCED": "Smart",
  "TIER_2": "Tier 2",
  "LIGHTNING": "Lightning",
  "DOD": "DOD",
  "COMMERCIAL": "Comercial",
};

function fmtCampaignType(raw: string): string {
  if (!raw) return "—";
  return CAMPAIGN_TYPE_MAP[raw.toUpperCase()] || raw;
}

// Compute priority score for each item
interface ScoredItem extends EligibilityItem {
  gapDesconto: number;
  score: number;
  campaignType: string;
  discountSellerPct: number;
  mediaTsiDiario7d: number;
}

function computeScoredItems(items: EligibilityItem[]): ScoredItem[] {
  // Deduplica por MLB (itemId): cada anúncio aparece UMA vez.
  // Para cada MLB, mantém o registro mais recente (por data) como base
  // e consolida métricas numéricas escolhendo o pico observado no período,
  // evitando inflar valores ao somar snapshots já agregados (7d).
  const byMlb = new Map<string, EligibilityItem>();
  for (const it of items) {
    const key = String(it.itemId);
    const prev = byMlb.get(key);
    if (!prev) {
      byMlb.set(key, { ...it });
      continue;
    }
    const prevDate = prev.data ? new Date(prev.data).getTime() : 0;
    const curDate = it.data ? new Date(it.data).getTime() : 0;
    // Base = registro mais recente (descritivos: nome, categoria, ação, campanha)
    const base = curDate >= prevDate ? { ...it } : { ...prev };
    const other = curDate >= prevDate ? prev : it;
    // Consolida métricas pegando o maior valor observado entre as ocorrências
    base.pedidos7d = Math.max(prev.pedidos7d || 0, it.pedidos7d || 0);
    base.mediaTsiDiario7d = Math.max(prev.mediaTsiDiario7d || 0, it.mediaTsiDiario7d || 0);
    base.estoqueMedio7d = Math.max(prev.estoqueMedio7d || 0, it.estoqueMedio7d || 0);
    base.estoqueMedioFull7d = Math.max(prev.estoqueMedioFull7d || 0, it.estoqueMedioFull7d || 0);
    base.discountTotal = Math.max(prev.discountTotal || 0, it.discountTotal || 0);
    base.discountBest = Math.max(prev.discountBest || 0, it.discountBest || 0);
    base.discountSellerPercentage = Math.max(
      prev.discountSellerPercentage || 0,
      it.discountSellerPercentage || 0,
    );
    base.flagBestPromo = prev.flagBestPromo || it.flagBestPromo;
    // Optin: considera ativo se QUALQUER ocorrência estiver opted-in
    // (flagItemSOptin = true significa "SEM optin" pelo nome do campo)
    base.flagItemSOptin = prev.flagItemSOptin && it.flagItemSOptin;
    // Mantém referências secundárias quando faltarem na base
    if (!base.itemName && other.itemName) base.itemName = other.itemName;
    if (!base.domDomainAgg1 && other.domDomainAgg1) base.domDomainAgg1 = other.domDomainAgg1;
    if (!base.campaignIdBest && other.campaignIdBest) base.campaignIdBest = other.campaignIdBest;
    if (!base.campaignType && other.campaignType) base.campaignType = other.campaignType;
    if (!base.acaoRecomendada && other.acaoRecomendada) base.acaoRecomendada = other.acaoRecomendada;
    byMlb.set(key, base);
  }
  const unique = Array.from(byMlb.values());

  return unique.map(item => {
    const discountSellerPct = (item as any).discountSellerPercentage ?? item.discountTotal;
    const mediaTsi = (item as any).mediaTsiDiario7d ?? 0;
    const campaignType = (item as any).campaignType ?? "";
    const pedidos = item.pedidos7d || 0;
    const gapDesconto = item.discountTotal - discountSellerPct;
    const score = (pedidos * 0.5) + (gapDesconto * 2) + (mediaTsi * 10);

    return {
      ...item,
      gapDesconto: Math.round(gapDesconto * 100) / 100,
      score: Math.round(score * 100) / 100,
      campaignType,
      discountSellerPct,
      mediaTsiDiario7d: mediaTsi,
    };
  });
}

const getActionBadge = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes("optin") || lower.includes("s/ optin"))
    return { className: "bg-destructive/15 text-destructive border-destructive/30", label: "Item s/ Optin" };
  if (lower.includes("desconto") || lower.includes("atrativo"))
    return { className: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Melhorar desconto" };
  if (lower.includes("campanha"))
    return { className: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: action };
  return { className: "bg-muted/30 text-muted-foreground border-border", label: action || "—" };
};

type SortKey = "score" | "pedidos7d" | "gapDesconto";

const OpportunitiesPanel = ({ items }: OpportunitiesPanelProps) => {
  const [catFilter, setCatFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const scored = useMemo(() => computeScoredItems(items), [items]);

  const categories = useMemo(() => {
    const set = new Set(scored.map(i => i.domDomainAgg1).filter(Boolean));
    return Array.from(set).sort();
  }, [scored]);

  const filtered = useMemo(() => {
    let result = scored;
    if (catFilter !== "all") result = result.filter(i => i.domDomainAgg1 === catFilter);
    if (actionFilter === "sem_optin") result = result.filter(i => i.flagItemSOptin);
    else if (actionFilter === "melhorar_desconto") result = result.filter(i =>
      i.acaoRecomendada.toLowerCase().includes("atrativo") || i.acaoRecomendada.toLowerCase().includes("desconto")
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => (i.itemName || "").toLowerCase().includes(q) || i.itemId.toLowerCase().includes(q));
    }
    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "pedidos7d") return b.pedidos7d - a.pedidos7d;
      return b.gapDesconto - a.gapDesconto;
    });
    return result;
  }, [scored, catFilter, actionFilter, searchQuery, sortBy]);

  const displayed = showAll ? filtered : filtered.slice(0, 20);

  // BLOCO 3: Profile cards
  const profileCards = useMemo(() => {
    if (scored.length === 0) return null;
    const medianPedidos = (() => {
      const vals = scored.map(i => i.pedidos7d).filter(v => v > 0).sort((a, b) => a - b);
      if (vals.length === 0) return 0;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    })();

    const highDemandItems = scored.filter(i => i.pedidos7d > medianPedidos);

    const card1Count = highDemandItems.filter(i => i.flagItemSOptin).length;
    const card2Count = highDemandItems.filter(i =>
      (i.acaoRecomendada.toLowerCase().includes("atrativo") || i.acaoRecomendada.toLowerCase().includes("desconto"))
      && i.gapDesconto > 2
    ).length;
    const bestProduct = scored.length > 0 ? scored.reduce((best, i) => i.score > best.score ? i : best, scored[0]) : null;

    return { card1Count, card2Count, bestProduct, medianPedidos };
  }, [scored]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === displayed.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayed.map(i => i.id)));
  };

  const exportSelected = () => {
    const sel = displayed.filter(i => selectedIds.has(i.id));
    const csvLines = ["CAMPAIGN_ID_BEST;ITEM_ID"];
    sel.forEach(i => csvLines.push(linhaCsvSegura([i.campaignIdBest, i.itemId])));
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optin_massa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyItemIds = () => {
    const ids = filtered.map(i => i.itemId).join(", ");
    navigator.clipboard.writeText(ids);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center">
        <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum dado de elegibilidade encontrado para este seller.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Importe o arquivo <code className="bg-muted px-1 py-0.5 rounded text-[10px]">SFTP_ECOMCONSULT_ELEGIBILIDADE</code> na área Admin.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* BLOCO 3: Profile Cards */}
      {profileCards && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 border-l-4 border-l-destructive">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Alta demanda sem optin</p>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{profileCards.card1Count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Itens com boa demanda aguardando ativação CDP</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass-card p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Melhorar desconto</p>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{profileCards.card2Count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Itens com desconto abaixo do potencial</p>
          </motion.div>

          {profileCards.bestProduct && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass-card p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Produto prioritário</p>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{profileCards.bestProduct.itemName || profileCards.bestProduct.itemId}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                <span>{profileCards.bestProduct.pedidos7d} pedidos</span>
                <span>Gap: {profileCards.bestProduct.gapDesconto > 0 ? `+${profileCards.bestProduct.gapDesconto.toFixed(1)}%` : "—"}</span>
                <span>Score: {profileCards.bestProduct.score.toFixed(0)}</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Filtros</span>
          </div>

          {/* Category pills */}
          <ToggleGroup type="single" value={catFilter} onValueChange={v => { if (v) setCatFilter(v); }} className="flex flex-wrap gap-1">
            <ToggleGroupItem value="all" className="text-[10px] px-2 py-0.5 h-6 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Todas
            </ToggleGroupItem>
            {categories.map(c => (
              <ToggleGroupItem key={c} value={c} className="text-[10px] px-2 py-0.5 h-6 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                {c.length > 18 ? c.slice(0, 16) + "…" : c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action filter */}
          <ToggleGroup type="single" value={actionFilter} onValueChange={v => { if (v) setActionFilter(v); }} className="flex gap-1">
            <ToggleGroupItem value="all" className="text-[10px] px-2 py-0.5 h-6 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Todos
            </ToggleGroupItem>
            <ToggleGroupItem value="sem_optin" className="text-[10px] px-2 py-0.5 h-6 rounded-full data-[state=on]:bg-destructive/20 data-[state=on]:text-destructive">
              Sem optin
            </ToggleGroupItem>
            <ToggleGroupItem value="melhorar_desconto" className="text-[10px] px-2 py-0.5 h-6 rounded-full data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-400">
              Melhorar desconto
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-7 text-xs" />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[140px] h-7 text-xs bg-card/60 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Por Score</SelectItem>
              <SelectItem value="pedidos7d">Por Pedidos</SelectItem>
              <SelectItem value="gapDesconto">Por Gap</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyItemIds} className="gap-1.5 text-xs h-7">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado!" : "Copiar IDs"}
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={exportSelected} className="gap-1.5 text-xs h-7 bg-neon-blue/10 text-neon-blue border-neon-blue/30 hover:bg-neon-blue/20">
                <Download className="w-3.5 h-3.5" />
                Exportar Optin ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Tabela de Produtos
          </h3>
          <TooltipInfo text="Produtos ordenados por Score de Prioridade. Score = (Pedidos×0.5) + (Gap desconto×2) + (TSI diário×10)." />
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} itens</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-1.5 text-left w-8">
                  <input type="checkbox" checked={selectedIds.size === displayed.length && displayed.length > 0} onChange={selectAll} className="rounded border-border" />
                </th>
                <th className="text-left py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Produto</th>
                <th className="text-left py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Categoria</th>
                <th className="text-center py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ação</th>
                <th className="text-center py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tipo</th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Desc. Seller
                  <TooltipInfo text={"Desconto que sai do bolso do seller.\n\nFórmula: discount_seller_percentage ÷ 10.\nO campo vem da base em décimos de ponto percentual (×10): 82 = 8,2%, 274 = 27,4%.\n\nÉ a abertura de preço do seller sobre o preço cheio do anúncio — não inclui a parte bancada pelo Mercado Livre."} />
                </th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Desc. Sugerido
                  <TooltipInfo text={"Desconto total visto pelo comprador na campanha sugerida.\n\nFórmula: discount_total ÷ 10 (mesma escala; pisos típicos 30 = 3% e 50 = 5%).\n\nAbertura de preço: parte ML = discount_total − discount_seller_percentage (nunca negativa). Quanto maior essa diferença, maior a fatia do desconto bancada pelo Mercado Livre."} />
                </th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Gap
                  <TooltipInfo text={"Gap = Desc. Sugerido − Desc. Seller, em pontos percentuais.\n\nFórmula: (discount_total − discount_seller_percentage) ÷ 10.\n\nGap positivo = o ML está disposto a bancar essa diferença; o seller ainda não aplicou o desconto necessário para ativar a campanha. Gap negativo = seller já desconta mais do que a campanha exige (abertura de preço acima do necessário — margem sendo entregue sem contrapartida)."} />
                </th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pedidos 7d</th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">TSI diário</th>
                <th className="text-right py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Estoque</th>
                <th className="text-center py-2 px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Best</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, idx) => {
                const badge = getActionBadge(item.acaoRecomendada);
                const cleanItemId = String(item.itemId).replace(/\D/g, "");
                const mlbLink = cleanItemId ? `https://produto.mercadolivre.com.br/MLB-${cleanItemId}` : "";
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-1.5 px-1.5">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-border" />
                    </td>
                    <td className="py-1.5 px-1.5 max-w-[200px]">
                      <div className="flex items-center gap-1">
                        {mlbLink ? (
                          <a href={mlbLink} target="_blank" rel="noopener noreferrer" className="text-[#4DD0E1] hover:underline truncate font-medium text-[11px] flex items-center gap-0.5">
                            {(item.itemName || item.itemId).slice(0, 40)}
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="truncate text-[11px]">{(item.itemName || item.itemId).slice(0, 40)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 text-[10px] text-muted-foreground">{item.domDomainAgg1 || "—"}</td>
                    <td className="py-1.5 px-1.5 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-[10px] text-muted-foreground">
                      {fmtCampaignType(item.campaignType)}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px]">
                      {item.discountSellerPct > 0 ? `${(item.discountSellerPct / 10).toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px]">
                      {item.discountTotal > 0 ? `${(item.discountTotal / 10).toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px]">
                      {item.gapDesconto > 0 ? (
                        <span className="text-emerald-400">+{(item.gapDesconto / 10).toFixed(1)}%</span>
                      ) : item.gapDesconto === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-destructive">{(item.gapDesconto / 10).toFixed(1)}%</span>
                      )}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px] font-medium">
                      {item.pedidos7d > 0 ? item.pedidos7d.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px]">
                      {item.mediaTsiDiario7d > 0 ? item.mediaTsiDiario7d.toFixed(1) : "—"}
                    </td>
                    <td className="text-right py-1.5 px-1.5 font-mono text-[11px]">
                      {item.estoqueMedio7d > 0 ? item.estoqueMedio7d.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="text-center py-1.5 px-1.5">
                      {item.flagBestPromo ? <Star className="w-3.5 h-3.5 text-amber-400 mx-auto" fill="currentColor" /> : <span className="text-muted-foreground text-[10px]">—</span>}
                    </td>
                  </motion.tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum item encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!showAll && filtered.length > 20 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAll(true)} className="gap-1.5 text-xs">
              <ChevronDown className="w-3.5 h-3.5" />
              Ver mais ({filtered.length - 20} restantes)
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OpportunitiesPanel;
