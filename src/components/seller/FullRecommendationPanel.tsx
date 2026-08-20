import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { ChevronDown, ChevronRight, Package2, TrendingUp } from "lucide-react";
import {
  getFullRecommendations,
  type FullCandidate,
} from "@/lib/queries/fullRecommendations";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

const COR_PRIORIDADE: Record<FullCandidate["prioridade"], string> = {
  alta: "hsl(160, 84%, 39%)",
  media: "hsl(45, 80%, 55%)",
  baixa: "hsl(215, 20%, 45%)",
  aguardar_estoque: "hsl(215, 25%, 30%)",
  sem_vendas: "hsl(0, 60%, 45%)",
};

const BADGE_PRIORIDADE: Record<FullCandidate["prioridade"], string> = {
  alta: "🟢 Alta",
  media: "🟡 Média",
  baixa: "⬜ Baixa",
  aguardar_estoque: "📦 Repor Estoque",
  sem_vendas: "🚫 Sem vendas",
};

const COR_CURVA: Record<string, string> = {
  A: "hsl(160, 84%, 45%)",
  B: "hsl(199, 100%, 60%)",
  C: "hsl(45, 80%, 55%)",
  sem_venda: "hsl(0, 60%, 50%)",
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

type Props = { sellerId: string; custId?: string | number };

const FullRecommendationPanel = ({ sellerId, custId }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<
    "todos" | "alta" | "media" | "aguardar_estoque" | "sem_vendas"
  >("todos");
  const [mostrarFronteira, setMostrarFronteira] = useState(false);

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

  const scatterData = useMemo(
    () =>
      (portfolio?.candidatos ?? []).map((c) => ({
        x: c.sigma * 100,
        y: c.mu,
        name: c.item_name,
        prioridade: c.prioridade,
        sharpe: c.sharpe,
      })),
    [portfolio],
  );

  if (isLoading) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted-foreground">
        Calculando portfólio Full…
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

  const recomendados = portfolio.candidatos.filter(
    (c) => c.prioridade === "alta" || c.prioridade === "media",
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package2 className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Recomendação de Anúncios para Full
            </h3>
            <TooltipInfo text="Modelo de portfólio inspirado em Markowitz (1952). μ = ganho de GMV mensal estimado; σ = risco composto (ruptura + incerteza Poisson); Sharpe = μ/(1+σ)." />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Maximiza ganho de GMV por risco de ruptura · Uplift estimado +
            {(portfolio.fullPremiumUsado * 100).toFixed(0)}% para este seller.
          </p>
          {portfolio.dataReferencia && (
            <p className="text-[10px] text-muted-foreground">
              Base: snapshots de elegibilidade até{" "}
              {new Date(`${portfolio.dataReferencia}T00:00:00`).toLocaleDateString("pt-BR")} ·
              janelas móveis de 7, 15 e 30 dias.
            </p>
          )}
        </div>
        <button
          onClick={() => setMostrarFronteira((v) => !v)}
          className="text-[11px] px-3 py-1.5 rounded-md border border-border bg-background hover:bg-accent transition-colors"
        >
          {mostrarFronteira ? "Ocultar" : "Ver"} Fronteira Eficiente
        </button>
      </div>

      {/* Cards de portfólio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="metric-label flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> GMV adicional estimado
          </p>
          <p className="metric-value emerald-text mt-1">
            {fmtBRL(portfolio.totalGMVGanho)}
            <span className="text-xs text-muted-foreground">/mês</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {recomendados.length} anúncios no portfólio recomendado
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="metric-label">Risco médio do portfólio</p>
          <p className="metric-value text-warning mt-1">
            {(portfolio.totalRiscoMedio * 100).toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Probabilidade média de ruptura (σ)
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="metric-label">Índice de Eficiência</p>
          <p className="metric-value neon-text mt-1">
            {fmtBRL(portfolio.indiceEficiencia)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Sharpe do portfólio (GMV / risco) · desconto ρ aplicado
          </p>
        </div>
      </div>

      {/* Curva por janela (7/15/30 dias) */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Curva de demanda do cust — 7 / 15 / 30 dias
          </p>
          <TooltipInfo text="Velocidade média por janela móvel, calculada sobre os snapshots de PEDIDOS_7D. A velocidade usada no modelo é ponderada: 50% janela 7d, 30% 15d, 20% 30d." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {portfolio.janelas.map((j) => (
            <div key={j.dias} className="p-3 rounded-md bg-card border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Últimos {j.dias} dias
              </p>
              <p className="text-sm font-mono tabular-nums text-foreground mt-1">
                {j.pedidos.toLocaleString("pt-BR")} pedidos
              </p>
              <p className="text-[10px] text-muted-foreground">
                {j.itens_com_venda} MLBs com venda · GMV estimado {fmtBRL(j.gmv_estimado)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Curva ABC (Pareto sobre GMV estimado de 30 dias)
          </p>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
            {portfolio.curvaAbc
              .filter((c) => c.itens > 0)
              .map((c) => (
                <div
                  key={c.curva}
                  style={{
                    width: `${(c.itens / portfolio.candidatos.length) * 100}%`,
                    background: COR_CURVA[c.curva],
                  }}
                  title={`${c.curva}: ${c.itens} MLBs`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {portfolio.curvaAbc.map((c) => (
              <div key={c.curva} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: COR_CURVA[c.curva] }}
                />
                {c.curva === "sem_venda" ? "Sem venda (30d)" : `Curva ${c.curva}`} · {c.itens} MLBs
                {c.curva !== "sem_venda" && ` · ${(c.share * 100).toFixed(0)}% do GMV`}
              </div>
            ))}
          </div>
          {portfolio.itensSemVenda > 0 && (
            <p className="text-[10px] text-destructive mt-2">
              {portfolio.itensSemVenda} MLBs sem nenhum pedido em 30 dias foram removidos da
              recomendação de envio ao Full (gerariam armazenagem sem giro).
            </p>
          )}
        </div>
      </div>

      {/* Fronteira eficiente */}
      {mostrarFronteira && (
        <div className="glass-card p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">
            Fronteira Eficiente — Ganho vs Risco
          </h4>
          <p className="text-[11px] text-muted-foreground mb-3">
            Pontos no canto superior esquerdo (alto ganho, baixo risco) são ideais.
            Tamanho proporcional ao Sharpe.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 14%)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Risco"
                tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                label={{
                  value: "Risco σ (%)",
                  position: "insideBottom",
                  offset: -15,
                  fontSize: 10,
                  fill: "hsl(215, 20%, 55%)",
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Ganho"
                tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
                tickFormatter={(v) =>
                  v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`
                }
              />
              <ReTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }: any) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass-card p-2 !bg-card/95 text-[11px] space-y-0.5">
                      <p className="font-medium text-foreground">
                        {d.name?.slice(0, 40)}
                        {d.name?.length > 40 ? "…" : ""}
                      </p>
                      <p className="text-emerald">Ganho: {fmtBRL(d.y)}/mês</p>
                      <p className="text-warning">Risco: {d.x.toFixed(1)}%</p>
                      <p className="text-neon-blue">Sharpe: {d.sharpe.toFixed(0)}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                x={50}
                stroke="hsl(0, 70%, 50%)"
                strokeDasharray="4 4"
                label={{
                  value: "Risco alto",
                  fontSize: 9,
                  fill: "hsl(0, 70%, 50%)",
                  position: "top",
                }}
              />
              <Scatter data={scatterData}>
                {scatterData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={COR_PRIORIDADE[d.prioridade]}
                    r={d.sharpe > 500 ? 7 : d.sharpe > 150 ? 5 : 3}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {Object.entries(BADGE_PRIORIDADE).map(([k, label]) => (
              <div key={k} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: COR_PRIORIDADE[k as FullCandidate["prioridade"]] }}
                />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribuição por vertical */}
      {Object.keys(portfolio.distribuicaoVertical).length > 1 && (
        <div className="glass-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Diversificação do portfólio
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(portfolio.distribuicaoVertical).map(([v, n]) => (
              <span
                key={v}
                className="text-[11px] px-2 py-1 rounded-md bg-muted/40 text-foreground border border-border"
              >
                {v} · {n}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {Object.keys(portfolio.distribuicaoVertical).length} verticais —
            correlações &lt; 1 reduzem o risco total vs. concentrar em uma única categoria.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(["todos", "alta", "media", "aguardar_estoque", "sem_vendas"] as const).map((f) => {
          const count =
            f === "todos"
              ? portfolio.candidatos.length
              : portfolio.candidatos.filter((c) => c.prioridade === f).length;
          const label =
            f === "todos"
              ? "Todos"
              : f === "alta"
                ? "🟢 Alta"
                : f === "media"
                  ? "🟡 Média"
                  : f === "aguardar_estoque"
                    ? "📦 Repor Estoque"
                    : "🚫 Sem vendas";
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
              {label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_60px_60px_100px_100px_120px_24px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/20">
          <div>Anúncio</div>
          <div className="text-right">7d</div>
          <div className="text-right">15d</div>
          <div className="text-right">30d</div>
          <div className="text-right">GMV atual</div>
          <div className="text-right">GMV c/ Full</div>
          <div className="text-center">Prioridade</div>
          <div />
        </div>

        {candidatosFiltrados.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhum anúncio neste filtro.
          </div>
        ) : (
          candidatosFiltrados.map((item) => {
            const isOpen = expanded === item.item_id;
            return (
              <div key={item.item_id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : item.item_id)}
                  className="w-full grid grid-cols-[1fr_60px_60px_60px_100px_100px_120px_24px] gap-2 px-3 py-2 text-[11px] hover:bg-muted/30 transition-colors text-left items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{item.item_name || item.item_id}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Curva {item.curva === "sem_venda" ? "—" : item.curva} · Sharpe{" "}
                      {item.sharpe.toFixed(0)} · {item.vertical}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums text-foreground">
                    {item.pedidos_7d}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {item.pedidos_15d}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {item.pedidos_30d}
                  </div>
                  <div className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtBRL(item.gmv_atual_estimado)}
                  </div>
                  <div className="text-right font-mono tabular-nums text-emerald">
                    {fmtBRL(item.gmv_full_estimado)}
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
                        { label: "μ (ganho/mês)", value: fmtBRL(item.mu), cor: "hsl(160, 84%, 50%)" },
                        {
                          label: "σ (risco)",
                          value: `${(item.sigma * 100).toFixed(1)}%`,
                          cor: item.sigma > 0.5 ? "hsl(0, 70%, 60%)" : "hsl(45, 80%, 60%)",
                        },
                        { label: "Sharpe", value: item.sharpe.toFixed(0), cor: "hsl(199, 100%, 60%)" },
                        {
                          label: "Uplift Full",
                          value: `+${(item.full_premium * 100).toFixed(0)}%`,
                          cor: "hsl(280, 80%, 70%)",
                        },
                      ].map((m) => (
                        <div key={m.label} className="p-2 rounded-md bg-card border border-border">
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          <p className="text-sm font-mono tabular-nums" style={{ color: m.cor }}>
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Composição do risco (σ)
                      </p>
                      {[
                        {
                          label: `Ruptura de estoque (peso 50%)`,
                          value: item.stockout_risk,
                          cor: "hsl(0, 70%, 60%)",
                          tooltip: `e^(-${item.days_of_stock.toFixed(0)}/30)`,
                        },
                        {
                          label: `Incerteza de demanda (peso 30%)`,
                          value: item.demand_uncertainty,
                          cor: "hsl(45, 80%, 60%)",
                          tooltip: `Poisson 1/√(${item.pedidos_30d}+1)`,
                        },
                        {
                          label: `Volatilidade entre janelas (peso 20%)`,
                          value: item.volatilidade,
                          cor: "hsl(280, 80%, 70%)",
                          tooltip: `7d ${item.velocity_7d.toFixed(2)} · 15d ${item.velocity_15d.toFixed(2)} · 30d ${item.velocity_30d.toFixed(2)} un/dia`,
                        },
                      ].map((r) => (
                        <div key={r.label}>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{r.label}</span>
                            <span className="font-mono">
                              {(r.value * 100).toFixed(0)}% · {r.tooltip}
                            </span>
                          </div>
                          <div className="h-1.5 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full rounded"
                              style={{
                                width: `${Math.min(r.value * 100, 100)}%`,
                                background: r.cor,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-md bg-card border-l-2 border-neon-blue">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Ação recomendada
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
        Metodologia: portfólio inspirado em Markowitz (1952). μ = ganho de GMV mensal
        estimado com uplift Full; σ = risco composto (ruptura 60% + incerteza Poisson 40%);
        Sharpe = μ/(1+σ). Risco do portfólio descontado pela correlação média entre verticais.
      </p>
    </div>
  );
};

export default FullRecommendationPanel;