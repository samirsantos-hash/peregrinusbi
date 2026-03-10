import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Copy, Check, Video, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ListingQuality } from "@/hooks/useListingsQuality";

interface CriticalListingsTableProps {
  listings: ListingQuality[];
}

const CriticalListingsTable = ({ listings }: CriticalListingsTableProps) => {
  const [copied, setCopied] = useState(false);
  const [showClipsOnly, setShowClipsOnly] = useState(false);

  // Filter only critical listings (score < 70) or with issues
  const criticalListings = useMemo(() => {
    let filtered = listings.filter((l) => l.avgScore > 0 && (l.avgScore < 70 || l.issues.length > 0));
    if (showClipsOnly) {
      filtered = filtered.filter((l) => l.sellersClipsPubli > 0);
    }
    return filtered.sort((a, b) => a.avgScore - b.avgScore);
  }, [listings, showClipsOnly]);

  const handleCopyAll = async () => {
    const ids = criticalListings.map((l) => `MLB${l.itemId.replace(/\D/g, "")}`).join(", ");
    try {
      await navigator.clipboard.writeText(ids);
      setCopied(true);
      toast.success(`${criticalListings.length} MLBs copiados para a área de transferência`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const getSeverityColor = (score: number) => {
    if (score < 50) return "bg-destructive/15 text-destructive border-destructive/30";
    return "bg-warning/15 text-warning border-warning/30";
  };

  if (criticalListings.length === 0 && listings.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Anúncios Críticos — Deep Link MLB
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({criticalListings.length} itens)
          </span>
        </h4>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClipsOnly(!showClipsOnly)}
            className={`text-xs gap-1.5 ${showClipsOnly ? "border-[#00E676]/40 text-[#00E676]" : ""}`}
          >
            <Video className="w-3.5 h-3.5" />
            {showClipsOnly ? "Com Clips" : "Filtrar Clips"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            disabled={criticalListings.length === 0}
            className="text-xs gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado!" : "Copiar Todos os MLBs"}
          </Button>
        </div>
      </div>

      {criticalListings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {showClipsOnly
            ? "Nenhum anúncio com Clips ativo abaixo do padrão."
            : "🏆 Todos os anúncios estão acima do padrão recomendado!"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  MLB ID
                </th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Status
                </th>
                <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  O que Corrigir
                </th>
                <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  <Video className="w-3.5 h-3.5 inline" />
                </th>
              </tr>
            </thead>
            <tbody>
              {criticalListings.map((listing, idx) => (
                <motion.tr
                  key={listing.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  {/* MLB ID with deep link */}
                  <td className="py-2.5 px-3">
                    <a
                      href={listing.mlbLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono font-medium text-[#4DD0E1] hover:text-[#80DEEA] transition-colors"
                    >
                      MLB{listing.itemId.replace(/\D/g, "")}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  </td>

                  {/* Severity badge */}
                  <td className="text-center py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getSeverityColor(listing.avgScore)}`}
                    >
                      {listing.avgScore}
                    </span>
                  </td>

                  {/* Issues */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {listing.issues.length > 0 ? (
                        listing.issues.map((issue) => (
                          <span
                            key={issue}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border/50"
                          >
                            {issue}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Score geral baixo</span>
                      )}
                    </div>
                  </td>

                  {/* Clips indicator */}
                  <td className="text-center py-2.5 px-3">
                    {listing.sellersClipsPubli > 0 ? (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: "#00E67620", color: "#00E676" }}
                      >
                        <Video className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default CriticalListingsTable;
