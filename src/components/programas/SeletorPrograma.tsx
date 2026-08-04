import { cn } from "@/lib/utils";
import SemaforoStatus from "./base/SemaforoStatus";
import { fmtBRL0, piorStatus, progressoMeta, semaforoGeral } from "@/lib/programas/status";
import type { Participacao, Programa } from "@/types/programas";

interface Props {
  participacoes: Participacao[];
  programasPorId: Map<string, Programa>;
  selecionado: string; // "consolidado" ou programaId
  onSelecionar: (id: string) => void;
}

const SeletorPrograma = ({ participacoes, programasPorId, selecionado, onSelecionar }: Props) => {
  const consolidadoStatus = piorStatus(participacoes.map(semaforoGeral));
  const consolidadoGap = participacoes.reduce<number | null>((acc, p) => {
    const { gap } = progressoMeta(p);
    if (gap === null) return acc;
    return (acc ?? 0) + gap;
  }, null);
  const totalMeta = participacoes.reduce((s, p) => s + (p.cascata.filter((n) => n.destaque).slice(-1)[0]?.meta.valor ?? 0), 0);
  const totalReal = participacoes.reduce((s, p) => s + (p.realizado.valor ?? 0), 0);
  const consolidadoPct = totalMeta > 0 ? (totalReal / totalMeta) * 100 : null;

  const chips = [
    {
      id: "consolidado",
      nome: "Consolidado",
      corAcento: "215 25% 45%",
      status: consolidadoStatus,
      pct: consolidadoPct,
      gap: consolidadoGap,
    },
    ...participacoes.map((p) => {
      const { pct, gap } = progressoMeta(p);
      const prog = programasPorId.get(p.programaId);
      return {
        id: p.programaId,
        nome: prog?.nome ?? p.programaId,
        corAcento: prog?.corAcento ?? "215 25% 45%",
        status: semaforoGeral(p),
        pct,
        gap,
      };
    }),
  ];

  return (
    <div className="flex gap-3 overflow-x-auto flex-nowrap pb-2 scrollbar-thin">
      {chips.map((c) => {
        const ativo = c.id === selecionado;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelecionar(c.id)}
            style={ativo ? { borderColor: `hsl(${c.corAcento})` } : undefined}
            className={cn(
              "shrink-0 min-w-[220px] rounded-xl border bg-card px-3 py-2 text-left transition-colors",
              ativo ? "border-2" : "border border-border hover:border-muted-foreground/40",
            )}
            aria-pressed={ativo}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{c.nome}</span>
              <SemaforoStatus status={c.status} compacto />
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground font-mono tabular-nums">
              <span>{c.pct === null ? "—" : `${c.pct.toFixed(0)}% da meta`}</span>
              <span>{c.gap === null ? "gap —" : `gap ${fmtBRL0(c.gap)}`}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SeletorPrograma;
