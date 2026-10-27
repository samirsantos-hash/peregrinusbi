import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { num } from "@/lib/format";

export type MelhorQuando = "subir" | "descer" | "neutro";

type DeltaProps = {
  /** Variação em % (ou p.p. quando `pontos`). `null` = sem comparação. */
  delta: number | null | undefined;
  pontos?: boolean;
  melhorQuando?: MelhorQuando;
  /** Texto do período, ex.: "vs 30 dias anteriores". */
  periodo?: string;
  className?: string;
};

/** Cápsula vítrea de variação: seta + valor + período. Cor só quando há direção e juízo. */
export function DeltaCapsula({ delta, pontos = false, melhorQuando = "subir", periodo, className }: DeltaProps) {
  if (delta == null || !Number.isFinite(delta)) {
    return (
      <span className={cn("noite-chip shrink-0 text-muted-foreground", className)} title="Sem comparação anterior">
        Sem comparação
      </span>
    );
  }
  const estavel = Math.abs(delta) < 0.05;
  const sobe = delta > 0;
  const bom = estavel || melhorQuando === "neutro" ? null : sobe === (melhorQuando === "subir");
  const Icone = estavel ? Minus : sobe ? ArrowUpRight : ArrowDownRight;
  const valor = `${sobe && !estavel ? "+" : ""}${num(delta, pontos ? 2 : 1)}${pontos ? " p.p." : "%"}`;
  return (
    <>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums leading-5",
          bom === true && "border-ec-verde-txt/20 bg-ec-verde-txt/10 text-ec-verde-txt",
          bom === false && "border-destructive/20 bg-destructive/10 text-destructive",
          bom === null && "border-border bg-muted/50 text-muted-foreground",
          className,
        )}
        aria-label={`${estavel ? "Estável" : sobe ? "Subiu" : "Caiu"} ${valor}${periodo ? ` ${periodo}` : ""}${
          bom === null ? "" : bom ? ", bom sinal" : ", ponto de atenção"
        }`}
      >
        <Icone className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
        {valor}
      </span>
      {/* Período fora da cápsula: quebra de linha natural em vez de truncar o delta */}
      {periodo ? <span className="min-w-0 text-xs leading-5 text-muted-foreground">{periodo}</span> : null}
    </>
  );
}

type KpiVidroProps = {
  rotulo: string;
  valor: string;
  delta?: number | null;
  deltaPontos?: boolean;
  melhorQuando?: MelhorQuando;
  /** Texto do período do delta, ex.: "vs 30 dias anteriores". */
  periodo?: string;
  /** Nota curta sob o delta (meta, fórmula). */
  nota?: ReactNode;
  focal?: boolean;
  className?: string;
};

/**
 * Card KPI do módulo de vidro escuro. Altura preenche a célula do grid
 * (h-full + flex-col) para que a linha fique rigorosamente alinhada.
 * Valor com `truncate` + title: cifras longas nunca empurram a cápsula.
 */
export default function KpiVidro({
  rotulo,
  valor,
  delta,
  deltaPontos,
  melhorQuando = "subir",
  periodo,
  nota,
  focal,
  className,
}: KpiVidroProps) {
  return (
    <div
      className={cn(
        "kpi-vidro noite-vidro flex h-full min-w-0 flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5",
        "backdrop-blur-xl",
        "transition-transform duration-150",
        className,
      )}
    >
      {/* Rótulo: até 2 linhas antes de cortar — nunca esconde a palavra inteira */}
      <p className="line-clamp-2 text-xs font-medium leading-snug tracking-normal text-muted-foreground" title={rotulo}>
        {rotulo}
      </p>
      <div className="min-w-0 space-y-3">
        {/* Valor: encolhe por container query antes de truncar (ver .kpi-vidro-valor) */}
        <p
          className={cn(
            "kpi-vidro-valor truncate font-medium tracking-normal text-foreground tabular-nums leading-none",
            focal ? "text-[32px]" : "text-[28px]",
          )}
          title={valor}
        >
          {valor}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <DeltaCapsula delta={delta} pontos={deltaPontos} melhorQuando={melhorQuando} periodo={periodo} />
          {nota ? <span className="min-w-0 text-xs leading-5 text-muted-foreground">{nota}</span> : null}
        </div>
      </div>
    </div>
  );
}
