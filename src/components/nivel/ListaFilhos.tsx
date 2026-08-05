import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import SemaforoStatus from "@/components/programas/base/SemaforoStatus";
import Sparkline from "@/components/programas/base/Sparkline";
import { useNavegarPreservando } from "@/contexts/ContextoNavegacao";
import { ordenarPorUrgencia, type ItemFilho } from "@/lib/navegacao/tipos";
import { cn } from "@/lib/utils";

function fmt(valor: number | null, unidade: ItemFilho["unidade"]) {
  if (valor === null || Number.isNaN(valor)) return "—";
  if (unidade === "BRL")
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (unidade === "pct") return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

interface Props {
  itens: ItemFilho[];
  unidadeGap?: ItemFilho["unidade"];
  vazio: string;
  /** Reconciliação: número do pai e quantos filhos têm dado. */
  reconciliacao?: { totalPai: number | null; comDado: number; totalFilhos: number; unidade?: ItemFilho["unidade"] };
  /** L5 não navega: as linhas são correções, sem destino. */
  semNavegacao?: boolean;
}

export default function ListaFilhos({ itens, unidadeGap, vazio, reconciliacao, semNavegacao }: Props) {
  const navegar = useNavegarPreservando();
  const [expandido, setExpandido] = useState(false);

  const ordenados = ordenarPorUrgencia(itens);
  const visiveis = expandido ? ordenados : ordenados.slice(0, 10);

  if (!ordenados.length) {
    return <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">{vazio}</div>;
  }

  const somaFilhos = ordenados.reduce((s, i) => s + (i.valor ?? 0), 0);
  const unidade = ordenados[0]?.unidade ?? "BRL";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="divide-y divide-border">
        {visiveis.map((i) => {
          const Linha = semNavegacao ? "div" : "button";
          return (
            <Linha
              key={i.id}
              {...(semNavegacao ? {} : { onClick: () => navegar(i.destino), type: "button" as const })}
              className={cn(
                "w-full grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 text-left",
                !semNavegacao && "hover:bg-muted/40 transition-colors cursor-pointer",
              )}
            >
              <span className="truncate text-sm">{i.nome}</span>
              <SemaforoStatus status={i.status} />
              <span className="hidden md:block font-mono tabular-nums text-sm text-right min-w-[110px]">
                {fmt(i.valor, i.unidade)}
              </span>
              <span
                className={cn(
                  "hidden md:block font-mono tabular-nums text-xs text-right min-w-[90px]",
                  (i.gap ?? 0) < 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {fmt(i.gap, unidadeGap ?? i.unidade)}
              </span>
              <span className="hidden md:block">
                <Sparkline pontos={i.serie} />
              </span>
              <span className="hidden md:block text-xs text-primary whitespace-nowrap">{i.acao}</span>
            </Linha>
          );
        })}
      </div>

      {ordenados.length > 10 && !expandido && (
        <button
          onClick={() => setExpandido(true)}
          className="w-full px-4 py-2 text-xs text-primary hover:bg-muted/40 border-t border-border"
        >
          ver todas ({ordenados.length})
        </button>
      )}

      {reconciliacao && (
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums">
            {fmt(somaFilhos, reconciliacao.unidade ?? unidade)} · {reconciliacao.comDado} de{" "}
            {reconciliacao.totalFilhos} com dado
          </span>
          {reconciliacao.totalPai !== null &&
            Math.abs(somaFilhos - reconciliacao.totalPai) > Math.max(1, Math.abs(reconciliacao.totalPai) * 0.01) && (
              <span className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" /> não fecha com o total do nível acima (
                {fmt(reconciliacao.totalPai, reconciliacao.unidade ?? unidade)})
              </span>
            )}
        </div>
      )}
    </div>
  );
}
