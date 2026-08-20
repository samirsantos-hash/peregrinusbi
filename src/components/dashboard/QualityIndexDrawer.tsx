import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESTAQUE_ITENS_VERDES, type ItemDecomposto } from "@/lib/qualityIndex";
import type { PontoBbf } from "@/lib/qualityIndex";
import QualityIndexTrend from "@/components/dashboard/QualityIndexTrend";

const fmt = (v: number, casas = 1) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

const ROTULO_BLOCO: Record<string, string> = {
  caracteristica: "Característica",
  oferta: "Oferta",
  qualidade: "Qualidade",
};

interface Props {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  loja: string;
  score: number | null;
  origem: "fonte" | "recalculado";
  divergencia: number | null;
  itens: ItemDecomposto[];
  serie?: PontoBbf[];
}

const QualityIndexDrawer = ({ aberto, onOpenChange, loja, score, origem, divergencia, itens, serie = [] }: Props) => {
  const maiorGanho = Math.max(1, ...itens.map((i) => i.ganho ?? 0));
  const semDado = itens.filter((i) => i.valor == null).length;

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Quality Index — {loja}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* destaque obrigatório */}
          <div className="flex gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-2.5">
            <Lightbulb className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <p className="text-[13px] leading-snug">{DESTAQUE_ITENS_VERDES}</p>
          </div>

          {/* árvore do score */}
          <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-alt">Como o índice é montado</p>
            <p className="text-[22px] font-bold font-mono tabular-nums leading-none">
              {score != null ? fmt(score) : "—"}
            </p>
            <p className="text-[12px] text-muted-alt leading-snug">
              Média simples de três blocos: Característica (8 itens), Oferta (10 itens) e Qualidade (1 item).
              Cada bloco vale um terço do índice.
            </p>
            <p className="text-[11px] text-muted-foreground">
              {origem === "fonte"
                ? "Valor lido de SCORE_FINAL_BBF na fonte."
                : "Coluna SCORE_FINAL_BBF ausente na base servida ao painel — valor reconstruído pelos três blocos."}
            </p>
            {divergencia != null && divergencia > 0.01 && (
              <p className="flex items-center gap-1.5 text-[11px] text-warn">
                <AlertTriangle className="w-3 h-3" />
                Divergência de {fmt(divergencia, 4)} ponto entre a coluna da fonte e o recálculo.
              </p>
            )}
          </div>

          {/* evolução no período */}
          <QualityIndexTrend serie={serie} />

          {/* itens */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-alt mb-2">
              Ganho possível por item corrigido — ordenado por impacto
            </p>
            <div className="space-y-1">
              {itens.map((i) => (
                <div key={i.constante} className="rounded-md bg-muted/15 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] truncate">{i.nome}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {ROTULO_BLOCO[i.bloco]} · peso {fmt(i.peso, 2)} pts
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-mono tabular-nums">
                        {i.valor != null ? fmt(i.valor) : "—"}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] font-mono tabular-nums",
                          i.ganho != null && i.ganho > 0 ? "text-ok" : "text-muted-foreground",
                        )}
                      >
                        {i.ganho != null ? `+${fmt(i.ganho, 1)} pts` : "sem dado"}
                      </p>
                    </div>
                  </div>
                  {i.ganho != null && (
                    <div className="mt-1 h-1 rounded bg-muted/30 overflow-hidden">
                      <div
                        className="h-full bg-brand-blue"
                        style={{ width: `${Math.max(2, (i.ganho / maiorGanho) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {semDado > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                {semDado} de {itens.length} itens não são medidos na base agregada atual — aparecem como “—”
                e não entram no cálculo de ganho.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QualityIndexDrawer;
