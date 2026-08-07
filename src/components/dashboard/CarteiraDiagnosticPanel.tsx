import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LojaDiagnostico } from "@/hooks/useCarteiraConsolidado";
import { fmtBRLCompact } from "@/utils/formatters";

interface Props {
  lojas: LojaDiagnostico[];
  totalLojas: number;
  onSelectSeller: (id: string) => void;
  loading?: boolean;
}

function severidade(u: number) {
  if (u >= 80) return { label: "Crítico", cls: "border-destructive/40 bg-destructive/10 text-destructive" };
  if (u >= 40) return { label: "Atenção", cls: "border-warning/40 bg-warning/10 text-warning" };
  return { label: "Observar", cls: "border-border bg-muted/30 text-muted-foreground" };
}

/** Diagnóstico consolidado: lojas que exigem ação, pior primeiro. */
const CarteiraDiagnosticPanel = ({ lojas, totalLojas, onSelectSeller, loading }: Props) => {
  if (loading) {
    return (
      <div className="glass-card p-4 text-xs text-muted-foreground">
        Calculando diagnóstico da carteira...
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h2 className="text-sm font-semibold">Lojas que exigem ação</h2>
        <span className="text-[11px] text-muted-foreground">
          {lojas.length} de {totalLojas} loja(s) da sua carteira · ordenadas por urgência
        </span>
      </div>

      {lojas.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald" />
          Nenhuma loja da carteira apresenta sinal de risco no último mês com dado.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {lojas.slice(0, 15).map((l) => {
            const sev = severidade(l.urgencia);
            return (
              <button
                key={l.sellerId}
                onClick={() => onSelectSeller(l.sellerId)}
                className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-muted/30 rounded-md px-2 transition-colors"
              >
                <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${sev.cls}`}>
                  {sev.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {l.nickname}{" "}
                    <span className="font-mono text-muted-foreground">#{l.custId}</span>
                    <span className="text-muted-foreground"> · {fmtBRLCompact(l.gmv)}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{l.motivos.join(" · ")}</p>
                  <p className="text-[11px] text-neon-blue mt-0.5">→ {l.acao}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default CarteiraDiagnosticPanel;
