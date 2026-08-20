import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  BENCHMARKS_ADS,
  classAcos,
  classRoas,
  classTacos,
  corAcos,
  corRoas,
  corScore,
  corTacos,
  getPublicidadeMetricas,
} from "@/lib/queries/publicidade";
import { fmtBRL, fmtBRLCompact } from "@/utils/formatters";
import AdsGranularidadePanel from "./AdsGranularidadePanel";
import AcosTacosChart from "./AcosTacosChart";

type Props = {
  sellerUuid: string;
  custId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  sellerNickname?: string;
};

const PublicidadePanel = ({ sellerUuid, custId, fromDate, toDate, sellerNickname }: Props) => {
  const [grafico, setGrafico] = useState<"roas_acos" | "investimento">("roas_acos");

  const { data: m, isLoading } = useQuery({
    queryKey: ["publicidade", sellerUuid, custId, fromDate, toDate],
    queryFn: () =>
      getPublicidadeMetricas(supabase, { sellerUuid, custId, fromDate, toDate }),
    enabled: Boolean(sellerUuid && fromDate && toDate),
  });

  const semDados = useMemo(
    () => !!m && m.inv_pads === 0 && m.gmv_pads === 0,
    [m],
  );

  if (isLoading || !m) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-6 text-sm text-muted-foreground">
        Carregando métricas de Ads…
      </div>
    );
  }

  const scores: { label: string; val: number | null; max: number; ok: number; warn: number }[] = [
    { label: "Score PADS Final", val: m.score_pads, max: 100, ok: BENCHMARKS_ADS.scorePads.bom, warn: BENCHMARKS_ADS.scorePads.atencao },
    { label: "Score ACOS (ML)", val: m.score_acos, max: 100, ok: BENCHMARKS_ADS.scorePads.bom, warn: BENCHMARKS_ADS.scorePads.atencao },
    { label: "Score TACOS (ML)", val: m.score_tacos, max: 100, ok: BENCHMARKS_ADS.scorePads.bom, warn: BENCHMARKS_ADS.scorePads.atencao },
    { label: "% Dias com Ads", val: m.pct_dias_ativos, max: 100, ok: BENCHMARKS_ADS.diasAtivos.bom, warn: BENCHMARKS_ADS.diasAtivos.atencao },
    { label: "Itens com Ads (score)", val: m.itens_com_ads_score, max: 100, ok: BENCHMARKS_ADS.scorePads.bom, warn: BENCHMARKS_ADS.scorePads.atencao },
  ];
  const algumScore = scores.some((s) => s.val !== null && s.val !== undefined);

  return (
    <div className="space-y-5">
      {/* Banner sem dados */}
      {semDados && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          ⚠️ Nenhum investimento em Ads (PADS) detectado para {sellerNickname ?? "este seller"} no período.
          Verifique se há campanhas ativas no Mercado Ads.
        </div>
      )}

      {/* ── KPI Cards principais ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          titulo="ROAS"
          valor={`${m.roas.toFixed(2)}x`}
          cor={corRoas(m.roas)}
          badge={classRoas(m.roas)}
          descricao="Retorno sobre investimento em Ads"
          benchmark={[
            `≥ ${BENCHMARKS_ADS.roas.excelente}x excelente · ≥ ${BENCHMARKS_ADS.roas.bom}x bom`,
            `≥ ${BENCHMARKS_ADS.roas.atencao}x atenção · < ${BENCHMARKS_ADS.roas.atencao}x crítico`,
          ]}
        />
        <KpiCard
          titulo="ACOS"
          valor={`${m.acos.toFixed(1)}%`}
          cor={corAcos(m.acos)}
          badge={classAcos(m.acos)}
          descricao="Custo de Ads sobre GMV de Ads"
          benchmark={[
            `≤ ${BENCHMARKS_ADS.acos.excelente}% excelente · ≤ ${BENCHMARKS_ADS.acos.bom}% bom`,
            `≤ ${BENCHMARKS_ADS.acos.atencao}% atenção · > ${BENCHMARKS_ADS.acos.atencao}% crítico`,
          ]}
        />
        <KpiCard
          titulo="TACOS"
          valor={`${m.tacos.toFixed(1)}%`}
          cor={corTacos(m.tacos)}
          badge={classTacos(m.tacos)}
          descricao="Custo de Ads sobre GMV total da loja"
          benchmark={[
            `≤ ${BENCHMARKS_ADS.tacos.bom}% bom · ≤ ${BENCHMARKS_ADS.tacos.atencao}% atenção`,
            `> ${BENCHMARKS_ADS.tacos.critico}% comprometendo margem`,
          ]}
        />
        <div className="rounded-xl border border-border/40 bg-card/60 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ads no período
          </div>
          <div className="space-y-3">
            <Row label="Investimento" value={fmtBRL(m.inv_pads)} />
            <Row label="GMV gerado pelos Ads" value={fmtBRL(m.gmv_pads)} />
            <Row
              label="Pedidos via Ads · Ticket médio"
              value={`${m.tsi_pads.toLocaleString("pt-BR")} ped. · ${fmtBRL(m.ticket_medio)}`}
            />
            <Row label="% GMV via Ads" value={`${m.pct_gmv_ads.toFixed(1)}%`} />
          </div>
        </div>
      </div>

      {/* ── Nota CPC/CTR ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        ℹ️ <strong className="text-foreground">CPC e CTR não disponíveis:</strong>{" "}
        o arquivo SFTP do Mercado Livre não exporta dados de cliques e impressões por campanha.
        CPC (custo por clique) e CTR (taxa de clique) exigem acesso à API do Mercado Ads ou
        relatório interno da plataforma — não estão no feed utilizado por este dashboard.
      </div>

      {/* ── Scores ML ────────────────────────────────────────────────── */}
      {algumScore && (
        <div className="rounded-xl border border-border/40 bg-card/60 p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scores ML — PADS (avaliação do algoritmo)
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {scores.map(({ label, val, ok, warn }) =>
              val === null || val === undefined ? null : (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-semibold tabular-nums" style={{ color: corScoreCustom(val, ok, warn) }}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, val))}%`,
                        background: corScoreCustom(val, ok, warn),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ── Gráfico de evolução ──────────────────────────────────────── */}
      {m.historico.length >= 1 && (
        <div className="rounded-xl border border-border/40 bg-card/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Evolução histórica ({m.historico.length} {m.historico.length === 1 ? "mês" : "meses"})
            </div>
            <div className="flex gap-2">
              {([
                ["roas_acos", "ACOS / TACOS"],
                ["investimento", "Investimento vs GMV Ads"],
              ] as const).map(([g, label]) => (
                <button
                  key={g}
                  onClick={() => setGrafico(g)}
                  className="rounded-lg border px-3 py-1.5 text-xs transition-colors"
                  style={{
                    background: grafico === g ? "#1e293b" : "transparent",
                    borderColor: grafico === g ? "#3b82f6" : "#1e293b",
                    color: grafico === g ? "#93c5fd" : "#94a3b8",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {grafico === "roas_acos" ? (
            <AcosTacosChart pontos={m.historico} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={m.historico} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => String(v).slice(2)} />
                <YAxis tickFormatter={(v) => fmtBRLCompact(Number(v))} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }}
                  formatter={(value: any, name: any) => [
                    fmtBRL(Number(value)),
                    name === "inv" ? "Investimento" : "GMV via Ads",
                  ]}
                />
                <Legend formatter={(n) => (n === "inv" ? "Investimento" : "GMV via Ads")} />
                <Bar dataKey="inv" fill="#3b82f6">
                  {m.historico.map((d, i) => (
                    <Cell key={`inv-${i}`} fill={corRoas(d.roas)} fillOpacity={0.55} />
                  ))}
                </Bar>
                <Bar dataKey="gmv_ads" fill="#16A34A">
                  {m.historico.map((d, i) => (
                    <Cell key={`gmv-${i}`} fill={corRoas(d.roas)} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Legenda de cores por performance ROAS */}
          {grafico !== "roas_acos" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Cor por ROAS do mês:</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "#16A34A" }} /> Excelente (≥ {BENCHMARKS_ADS.roas.excelente}x)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "#4ade80" }} /> Bom (≥ {BENCHMARKS_ADS.roas.bom}x)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "#D97706" }} /> Atenção (≥ {BENCHMARKS_ADS.roas.atencao}x)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "#DC2626" }} /> Crítico (&lt; {BENCHMARKS_ADS.roas.atencao}x)
            </span>
          </div>
          )}
        </div>
      )}

      {/* Banner quando não há histórico mensal */}
      {m.historico.length === 0 && !semDados && (
        <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          ℹ️ Sem histórico mensal disponível (tabela <code>cpp_mensal</code> vazia para este seller).
          Os KPIs do período acima foram calculados a partir dos dados diários.
        </div>
      )}

      {/* ── Granularidade de investimento em Ads ─────────────────────── */}
      <AdsGranularidadePanel sellerUuid={sellerUuid} fromDate={fromDate} toDate={toDate} />

      {/* ── Impacto do TACOS na margem ───────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Impacto do TACOS na margem
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { margem: 10, label: "Margem baixa (10%)" },
            { margem: 20, label: "Margem média (20%)" },
            { margem: 30, label: "Margem alta (30%)" },
          ].map(({ margem, label }) => {
            const margemLiquida = margem - m.tacos;
            const ok = margemLiquida > 5;
            return (
              <div
                key={margem}
                className="rounded-lg border p-4"
                style={{
                  borderColor: ok ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.4)",
                  background: ok ? "rgba(22,163,74,0.05)" : "rgba(220,38,38,0.05)",
                }}
              >
                <div className="text-xs text-muted-foreground">{label}</div>
                <div
                  className="mt-1 font-mono text-2xl font-semibold tabular-nums"
                  style={{ color: ok ? "#16A34A" : "#DC2626" }}
                >
                  {margemLiquida.toFixed(1)}%
                </div>
                <div className="text-[11px] text-muted-foreground">margem líquida após Ads</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          TACOS atual: <span className="font-mono tabular-nums">{m.tacos.toFixed(1)}%</span> do GMV total consumido por Ads.
          Margem líquida = margem bruta estimada − TACOS.
        </div>
      </div>
    </div>
  );
};

function corScoreCustom(v: number, ok: number, warn: number): string {
  if (v >= ok) return "#16A34A";
  if (v >= warn) return "#D97706";
  return "#DC2626";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function KpiCard({
  titulo,
  valor,
  cor,
  badge,
  descricao,
  benchmark,
}: {
  titulo: string;
  valor: string;
  cor: string;
  badge: string;
  descricao: string;
  benchmark: string[];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ borderColor: cor, color: cor, background: `${cor}1a` }}
        >
          {badge}
        </span>
      </div>
      <div className="font-mono text-3xl font-bold tabular-nums" style={{ color: cor }}>
        {valor}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{descricao}</div>
      <div className="mt-3 space-y-0.5 text-[10px] text-muted-foreground/80">
        {benchmark.map((b, i) => (
          <p key={i}>{b}</p>
        ))}
      </div>
    </div>
  );
}

export default PublicidadePanel;