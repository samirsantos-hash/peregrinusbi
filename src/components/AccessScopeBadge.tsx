import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMyAccess } from "@/hooks/useMyAccess";

/**
 * Painel informativo mostrando ao usuário exatamente quais lojas
 * (cust_ids) ele pode acessar. Serve como "guarda visível" — todas as
 * queries reais são bloqueadas pelo RLS no banco.
 */
export default function AccessScopeBadge() {
  const { allowedSellers, allowedCustIds, isAdmin, loading } = useMyAccess();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary w-fit">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="font-semibold">Acesso total (admin)</span>
        <span className="text-muted-foreground">
          · {allowedSellers.length} loja(s) no sistema
        </span>
      </div>
    );
  }

  const total = allowedCustIds.length;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-warning/40 bg-warning/5 text-warning w-fit">
        <Lock className="w-3.5 h-3.5" />
        <span className="font-semibold">Nenhuma loja liberada</span>
        <span className="text-muted-foreground">· Contate um administrador</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-emerald/30 bg-emerald/5 text-xs w-full max-w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-emerald hover:bg-emerald/10 transition-colors rounded-md"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="font-semibold">Escopo de acesso</span>
        <span className="text-muted-foreground">
          · Você pode visualizar {total} loja(s)
        </span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          {open ? "Ocultar" : "Ver lojas"}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-emerald/20 px-3 py-2 flex flex-wrap gap-1.5">
          {allowedSellers.map((s) => (
            <Badge
              key={s.custId}
              variant="outline"
              className="text-[10px] border-emerald/30 bg-background/60 font-mono"
            >
              {s.nickname} <span className="text-muted-foreground ml-1">#{s.custId}</span>
            </Badge>
          ))}
          <p className="w-full text-[10px] text-muted-foreground mt-1">
            Lojas fora desta lista são bloqueadas automaticamente pelo servidor (RLS).
          </p>
        </div>
      )}
    </div>
  );
}