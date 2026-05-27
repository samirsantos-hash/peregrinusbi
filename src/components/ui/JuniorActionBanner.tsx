import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, GraduationCap } from "lucide-react";
import { useJuniorMode } from "@/hooks/useJuniorMode";
import { ACOES_POR_ABA, type ActionItem } from "@/lib/juniorActions";
import { cn } from "@/lib/utils";

type Props = {
  abaId: string;
  dados: Record<string, any>;
  maxAcoes?: number;
};

const STORAGE_PREFIX = "peregrinus_banner_";

export function JuniorActionBanner({ abaId, dados, maxAcoes = 3 }: Props) {
  const { enabled } = useJuniorMode();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + abaId);
    return raw === null ? true : raw === "true";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + abaId, String(open));
    } catch {}
  }, [abaId, open]);

  if (!enabled) return null;

  const lista = ACOES_POR_ABA[abaId] ?? [];
  const ativas: ActionItem[] = lista
    .filter((a) => {
      try {
        return a.condicao(dados);
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.prioridade - b.prioridade)
    .slice(0, maxAcoes);

  if (ativas.length === 0) return null;

  const prioColor = (p: 1 | 2 | 3) =>
    p === 1
      ? "border-l-destructive bg-destructive/5"
      : p === 2
      ? "border-l-warning bg-warning/5"
      : "border-l-neon-blue bg-neon-blue/5";

  const prioBadge = (p: 1 | 2 | 3) =>
    p === 1
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : p === 2
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-neon-blue/15 text-neon-blue border-neon-blue/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-neon-blue/20 bg-neon-blue/[0.03]"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-neon-blue/[0.05] transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-neon-blue" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neon-blue">
            Guia do Consultor
          </span>
          <span className="text-[10px] text-muted-foreground">
            {ativas.length} {ativas.length === 1 ? "ação sugerida" : "ações sugeridas"}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {ativas.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-l-4 rounded-r px-3 py-2 flex items-start gap-3",
                    prioColor(a.prioridade),
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase border rounded px-1.5 py-0.5 shrink-0 mt-0.5",
                      prioBadge(a.prioridade),
                    )}
                  >
                    P{a.prioridade}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{a.acao}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      <span className="font-semibold">Por que importa: </span>
                      {a.porqueImporta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default JuniorActionBanner;