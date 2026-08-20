import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Package2 } from "lucide-react";
import {
  getFullRecommendations,
  FULL_ESTOQUE_MINIMO_DIAS,
  type FullCandidate,
  type Prioridade,
} from "@/lib/queries/fullRecommendations";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

const COR_PRIORIDADE: Record<Prioridade, string> = {
  alta: "hsl(160, 84%, 39%)",
  media: "hsl(45, 80%, 55%)",
  baixa: "hsl(215, 20%, 45%)",
  repor_estoque: "hsl(25, 85%, 50%)",
  sem_movimento: "hsl(0, 60%, 45%)",
  sem_dado: "hsl(215, 15%, 35%)",
};

const BADGE_PRIORIDADE: Record<Prioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  repor_estoque: "Repor estoque",
  sem_movimento: "Sem movimento",
  sem_dado: "Sem dado",
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtNum = (v: number | null, casas = 0) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: casas });

const GRID = "grid-cols-[1fr_90px_110px_110px_90px_130px_24px]";

type Props = { sellerId: string; custId?: string | number };

const FullRecommendationPanel = ({ sellerId, custId }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Prioridade>("todos");

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ["full-recommendations", sellerId, custId],
    queryFn: () => getFullRecommendations(sellerId, custId),
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000,
  });

  const candidatosFiltrados = useMemo(() => {
    if (!portfolio) return [];
    return filtro === "todos"
      ? portfolio.candidatos
      : portfolio.candidatos.filter((c) => c.prioridade === filtro);
  }, [portfolio, filtro]);

  if (isLoading) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted-foreground">
        Calculando recomendações de Full…
      </div>
    );
  }

  if (!portfolio || portfolio.candidatos.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted-foreground">
        Sem dados de elegibilidade disponíveis para calcular recomendações Full.
      </div>
    );
  }

  const semConversao = portfolio.taxaConversao === null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2">
          <Package2 className="w-4 h-4 text-neon-blue" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Recomendação de anúncios para Full
          </h3>
          <TooltipInfo text={`Base: snapshots de elegibilidade (janela móvel de 7 dias) + base diária de KPIs do seller.

A coluna de tráfego da base de elegibilidade acompanha VISITAS, não pedidos — verificado contra a base diária. Unidades vendidas por anúncio não existem na fonte; são estimadas por visitas × taxa de conversão do seller (dado real da base diária) e sempre marcadas como estimativa.

Janelas de 15 e 30 dias foram removidas: eram reconstruídas por proporção a partir da janela de 7 dias, o que criava falsa tendência.`} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {portfolio.dataReferencia && (
            <>
              Snapshot de{" "}
              {new Date(`${portfolio.dataReferencia}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
            </>
          )}
          conversão do seller{" "}
          {portfolio.taxaConversao === null
            ? "não medida"
            : `${(portfolio.taxaConversao * 100).toFixed(2)}%`}{" "}
          · ticket médio{" "}
          {portfolio.ticketMedio === null ? "não medido" : fmtBRL(portfolio.ticketMedio)}{" "}
          (base diária, 30 dias).
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="metric-label">Visitas na carteira · 7 dias</p>
          <p className="metric-value mt-1">{portfolio.visitasTotais7d.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Dado real da fonte (janela móvel de 7 dias)
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="metric-label">GMV estimado dos recomendados · 30 dias</p>
          <p className="metric-value mt-1">{fmtBRL(portfolio.gmvEstimadoRecomendado)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Estimativa · {portfolio.itensRecomendados} anúncios em Alta/Média
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="metric-label flex items-center gap-1">
            Score de oportunidade
            <TooltipInfo text="Score de oportunidade (0–100), métrica própria deste painel: percentil do GMV estimado de 30 dias do anúncio dentro da carteira do seller, descontado em até 40% pelo risco de ruptura (exp(−cobertura/30)). Não é Sharpe ratio nem qualquer métrica financeira consagrada." />
          </p>
          <p className="metric-value mt-1">0 – 100</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Ranking relativo dentro desta carteira
          </p>
        </div>
      </div>

      {semConversao && (
        <div className="glass-card p-3 text-[11px] text-warning">
          Sem taxa de conversão medida na base diária deste seller: unidades vendidas e GMV
          estimado não podem ser calculados e aparecem como "—". Apenas visitas são exibidas.
        </div>
      )}

      {/* Regras e contagens das classes */}
      <div className="glass-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Regras de classificação e contagem
        </p>
        <div className="space-y-1.5">
          {portfolio.classes.map((c) => (
            <div key={c.chave} className="flex items-start gap-2 text-[11px]">
              <span
                className="mt-1 w-2 h-2 rounded-full shrink-0"
                style={{ background: COR_PRIORIDADE[c.chave] }}
              />
              <span className="text-foreground font-medium w-28 shrink-0">{c.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground w-14 shrink-0">
                {c.itens} MLBs
              </span>
              <span className="text-muted-foreground">{c.regra}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(["todos", "alta", "media", "repor_estoque", "baixa", "sem_movimento", "sem_dado"] as const).map(
          (f) => {
            const count =
              f === "todos"
                ? portfolio.candidatos.length
                : portfolio.candidatos.filter((c) => c.prioridade === f).length;
            const active = filtro === f;
            return (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`text-[11px] px-3 py-1.5 rounded-md border transition-colors ${
                  active
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {f === "todos" ? "Todos" : BADGE_PRIORIDADE[f]}{" "}
                <span className="opacity-70">({count})</span>
              </button>
            );
          },
        )}
      </div>

      {/* Lista */}
      <div className="glass-card overflow-hidden">
        <div
          className={`grid ${GRID} gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/20`}
        >
          <div>Anúncio</div>
          <div className="text-right">Visitas 7D</div>
          <div className="text-right">Un. vendidas 7D (est.)</div>
          <div className="text-right">GMV 30D (est.)</div>
          <div className="text-right">Score</div>
          <div className="text-center">Classificação</div>
          <div />
        </div>

        {candidatosFiltrados.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhum anúncio neste filtro.
          </div>
        ) : (
          candidatosFiltrados.map((item: FullCandidate) => {
            const isOpen = expanded === item.item_id;
            const semEstoque = item.estoque === 0 && item.estado !== "sem_dado";
            return (
              <div key={item.item_id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.item_id)}
                  className={`w-full grid ${GRID} gap-2 px-3 py-2 text-[11px] hover:bg-muted/30 transition-colors text-left items-center`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{item.item_name || item.item_id}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      {item.vertical}
                      {semEstoque && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                          sem estoque
                        </span>
                      )}
                      {item.estado === "sem_movimento" && (
                        <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                          sem venda no período
                        </span>
                      )}
                      {item.estado === "sem_dado" && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          sem dado no período
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums text-foreground">
                    {item.visitas_7d === null ? "—" : item.visitas_7d.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNum(item.unidades_est_7d, 1)}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {item.gmv_est_30d === null ? "—" : fmtBRL(item.gmv_est_30d)}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {item.score_oportunidade === null
                      ? "—"
                      : item.score_oportunidade.toFixed(0)}
                  </div>
                  <div className="text-center">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{
                        background: `${COR_PRIORIDADE[item.prioridade]}22`,
                        color: COR_PRIORIDADE[item.prioridade],
                      }}
                    >
                      {BADGE_PRIORIDADE[item.prioridade]}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 py-3 bg-muted/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        {
                          label: "Visitas 7D (real)",
                          value:
                            item.visitas_7d === null
                              ? "—"
                              : item.visitas_7d.toLocaleString("pt-BR"),
                        },
                        {
                          label: "Visitas 7D · ~28d antes",
                          value:
                            item.visitas_7d_anterior === null
                              ? "—"
                              : item.visitas_7d_anterior.toLocaleString("pt-BR"),
                        },
                        {
                          label: "Estoque médio 7D",
                          value: item.estoque.toLocaleString("pt-BR"),
                        },
                        {
                          label: "Cobertura estimada",
                          value:
                            item.cobertura_dias === null
                              ? "—"
                              : `${item.cobertura_dias.toFixed(0)} dias`,
                        },
                      ].map((m) => (
                        <div key={m.label} className="p-2 rounded-md bg-card border border-border">
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          <p className="text-sm font-mono tabular-nums text-foreground">
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-md bg-card border-l-2 border-neon-blue">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        {item.prioridade === "sem_movimento" || item.prioridade === "sem_dado"
                          ? "Diagnóstico"
                          : "Ação recomendada"}
                      </p>
                      <p className="text-xs text-foreground">{item.acao}</p>
                      <p className="text-[10px] text-muted-foreground italic mt-1">
                        {item.justificativa}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-muted-foreground italic px-1">
        Método: visitas de 7 dias são o único dado medido por anúncio na fonte. Unidades vendidas
        e GMV são estimados por visitas × conversão do seller × ticket médio (ambos reais, da base
        diária de 30 dias) e estão marcados como estimativa. Cobertura mínima considerada para
        envio ao Full: {FULL_ESTOQUE_MINIMO_DIAS} dias. Nenhum item sem movimento recebe
        recomendação de compra.
      </p>
    </div>
  );
};

export default FullRecommendationPanel;
