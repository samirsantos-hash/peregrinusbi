import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SemaforoStatus from "./base/SemaforoStatus";
import MetaVsAtual from "./base/MetaVsAtual";
import ValorMetrica from "./base/ValorMetrica";
import { fmtBRL0 } from "@/lib/programas/status";
import type { Alavanca, EstadoAlavanca, Parceiro } from "@/types/programas";

const PESO_ORDEM: Record<EstadoAlavanca, number> = {
  nao_ativado: 0,
  parcial: 1,
  sem_dado: 2,
  ativo: 3,
  nao_elegivel: 4,
};

const gapDe = (a: Alavanca) => {
  const at = a.valorAtual.valor;
  const ct = a.valorContratado.valor;
  if (at === null || ct === null) return 0;
  return ct - at;
};

/** Ordem = recomendação (4.9). Nunca alfabética. */
export function ordenarAlavancas(alavancas: Alavanca[]): Alavanca[] {
  return [...alavancas].sort((a, b) => {
    const pa = PESO_ORDEM[a.estado];
    const pb = PESO_ORDEM[b.estado];
    if (pa !== pb) return pa - pb;
    if (a.estado === "nao_ativado") return (b.impactoEstimado.valor ?? 0) - (a.impactoEstimado.valor ?? 0);
    if (a.estado === "parcial") return gapDe(b) - gapDe(a);
    return 0;
  });
}

interface Props {
  alavancas: Alavanca[];
  parceiros: Parceiro[];
}

const PainelAlavancas = ({ alavancas, parceiros }: Props) => {
  const ordenadas = ordenarAlavancas(alavancas);
  const ativadas = alavancas.filter((a) => a.estado === "ativo").length;
  const elegiveis = alavancas.filter((a) => a.estado !== "nao_elegivel").length;
  const potencialNaoAcionado = alavancas
    .filter((a) => a.estado === "nao_ativado")
    .reduce((s, a) => s + (a.impactoEstimado.valor ?? 0), 0);
  const progresso = elegiveis > 0 ? (ativadas / elegiveis) * 100 : 0;
  const parceiroPorId = new Map(parceiros.map((p) => [p.id, p]));

  return (
    <section className="glass-card p-4">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="metric-label">Alavancas</p>
          <p className="metric-value text-foreground">
            {ativadas} de {elegiveis} alavancas ativadas
          </p>
          <div className="mt-2 h-1.5 w-56 max-w-full rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{fmtBRL0(potencialNaoAcionado)}</span> em potencial não acionado
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {ordenadas.map((a) => {
          const parceiro = a.parceiroResponsavelId ? parceiroPorId.get(a.parceiroResponsavelId) : null;
          return (
            <article key={a.id} className="relative rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-2">
              {parceiro && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground">
                      {parceiro.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">{parceiro.nome} · {parceiro.papel}</TooltipContent>
                </Tooltip>
              )}
              <div className="pr-8">
                <h3 className="text-sm font-semibold text-foreground leading-tight">{a.nome}</h3>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{a.descricaoCurta}</p>
              </div>
              <SemaforoStatus estado={a.estado} className="self-start" />
              <MetaVsAtual atual={a.valorAtual} meta={a.valorContratado} rotuloMeta="contratado" />
              <p className="text-[11px] text-muted-foreground">
                {a.ativoDesde
                  ? `Ativo desde ${new Date(a.ativoDesde).toLocaleDateString("pt-BR")}`
                  : "Nunca ativado"}
              </p>
              {(a.estado === "ativo" || a.estado === "parcial") && (
                <p className="text-xs text-muted-foreground">
                  Resultado atribuído: <ValorMetrica metrica={a.resultadoAtribuido} className="text-foreground" />
                </p>
              )}
              {a.estado === "nao_ativado" && (
                <p className="text-xs text-muted-foreground">
                  Potencial: <ValorMetrica metrica={a.impactoEstimado} className="text-foreground" />
                </p>
              )}
              {a.proximaAcao && (
                <Button size="sm" variant="outline" className="mt-auto h-7 text-[11px]">
                  {a.proximaAcao}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default PainelAlavancas;
