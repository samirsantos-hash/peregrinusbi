import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  GRANULARIDADES,
  getSerieAdsGranular,
  getTopProdutosAds,
  type Granularidade,
} from "@/lib/queries/adsGranular";
import { corRoas } from "@/lib/queries/publicidade";
import { fmtBRL, fmtBRLCompact } from "@/utils/formatters";
import TooltipInfo from "@/components/dashboard/TooltipInfo";

type Props = {
  sellerUuid: string;
  fromDate: string;
  toDate: string;
};

type Metrica = "inv" | "roas" | "acos" | "tacos";

const METRICAS: { val: Metrica; label: string }[] = [
  { val: "inv", label: "Investimento" },
  { val: "roas", label: "ROAS" },
  { val: "acos", label: "ACOS" },
  { val: "tacos", label: "TACOS" },
];

const AdsGranularidadePanel = ({ sellerUuid, fromDate, toDate }: Props) => {
  const [granularidade, setGranularidade] = useState<Granularidade>("semana");
  const [metrica, setMetrica] = useState<Metrica>("inv");

  const { data: serie = [], isLoading } = useQuery({
    queryKey: ["ads-granular", sellerUuid, fromDate, toDate, granularidade],
    queryFn: () => getSerieAdsGranular(supabase, { sellerUuid, fromDate, toDate, granularidade }),
    enabled: Boolean(sellerUuid && fromDate && toDate),
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["ads-top-produtos", sellerUuid, fromDate, toDate],
    queryFn: () => getTopProdutosAds(supabase, { sellerUuid, fromDate, toDate }),
    enabled: Boolean(sellerUuid && fromDate && toDate),
  });

  const totais = useMemo(() => {
    const inv = serie.reduce((s, b) => s + b.inv, 0);
    const gmvAds = serie.reduce((s, b) => s + b.gmv_ads, 0);
    const gmvTot = serie.reduce((s, b) => s + b.gmv_total, 0);
    const comInv = serie.filter((b) => b.inv > 0);
    const melhor = comInv.slice().sort((a, b) => b.roas - a.roas)[0];
    const pior = comInv.slice().sort((a, b) => a.roas - b.roas)[0];
    return {
      inv,
      roas: inv > 0 ? gmvAds / inv : 0,
      tacos: gmvTot > 0 ? (inv / gmvTot) * 100 : 0,
      periodos: serie.length,
      comInv: comInv.length,
      melhor,
      pior,
      medioPorPeriodo: comInv.length > 0 ? inv / comInv.length : 0,
    };
  }, [serie]);

  const maxPedidos = useMemo(
    () => Math.max(1, ...produtos.map((p) => p.pedidos_7d)),
    [produtos],
  );

  return (
    <div className="space-y-5">
      {/* ── Seletores ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Granularidade do período
            </span>
            <TooltipInfo text="Agrupa o investimento em Ads (INV_PADS) por dia, semana (segunda a domingo), mês ou trimestre dentro do intervalo de datas selecionado no topo do painel." />
          </div>
          <div className="flex flex-wrap gap-2">
            {GRANULARIDADES.map((g) => (
              <button
                key={g.val}
                onClick={() => setGranularidade(g.val)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  granularidade === g.val
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Métrica em destaque
          </span>
          <div className="flex flex-wrap gap-2">
            {METRICAS.map((m) => (
              <button
                key={m.val}
                onClick={() => setMetrica(m.val)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  metrica === m.val
                    ? "border-neon-blue bg-neon-blue/15 text-neon-blue"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Resumo do recorte ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini titulo="Investimento no recorte" valor={fmtBRL(totais.inv)} />
        <Mini titulo="ROAS ponderado" valor={`${totais.roas.toFixed(2)}x`} cor={corRoas(totais.roas)} />
        <Mini
          titulo="Média por período ativo"
          valor={fmtBRL(totais.medioPorPeriodo)}
          rodape={`${totais.comInv} de ${totais.periodos} períodos com investimento`}
        />
        <Mini
          titulo="Melhor / pior período"
          valor={
            totais.melhor
              ? `${totais.melhor.label} · ${totais.melhor.roas.toFixed(1)}x`
              : "—"
          }
          rodape={totais.pior ? `pior: ${totais.pior.label} · ${totais.pior.roas.toFixed(1)}x` : undefined}
        />
      </div>

      {/* ── Gráfico por período ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-5">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Investimento em Ads por período ({serie.length}{" "}
          {granularidade === "dia" ? "dias" : granularidade === "semana" ? "semanas" : granularidade === "mes" ? "meses" : "trimestres"})
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando série…</div>
        ) : serie.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Sem dados diários de Ads no intervalo selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={serie} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
              <YAxis
                yAxisId="brl"
                tickFormatter={(v) => fmtBRLCompact(Number(v))}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <YAxis
                yAxisId="sec"
                orientation="right"
                tickFormatter={(v) => (metrica === "roas" ? `${Number(v).toFixed(0)}x` : `${Number(v).toFixed(0)}%`)}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }}
                formatter={(value: any, name: any) => {
                  const v = Number(value);
                  if (name === "inv") return [fmtBRL(v), "Investimento"];
                  if (name === "gmv_ads") return [fmtBRL(v), "GMV via Ads"];
                  if (name === "roas") return [`${v.toFixed(2)}x`, "ROAS"];
                  if (name === "acos") return [`${v.toFixed(1)}%`, "ACOS"];
                  return [`${v.toFixed(1)}%`, "TACOS"];
                }}
              />
              <Legend
                formatter={(n) =>
                  n === "inv" ? "Investimento" : n === "gmv_ads" ? "GMV via Ads" : n === "roas" ? "ROAS" : n === "acos" ? "ACOS %" : "TACOS %"
                }
              />
              <Bar yAxisId="brl" dataKey="inv" name="inv">
                {serie.map((b, i) => (
                  <Cell key={i} fill={corRoas(b.roas)} fillOpacity={0.6} />
                ))}
              </Bar>
              <Bar yAxisId="brl" dataKey="gmv_ads" name="gmv_ads" fill="#4E8AC9" fillOpacity={0.35} />
              {metrica !== "inv" && (
                <Line
                  yAxisId="sec"
                  type="monotone"
                  dataKey={metrica}
                  name={metrica}
                  stroke={metrica === "roas" ? "#29A084" : metrica === "acos" ? "#D97706" : "#DC2626"}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="mt-3 text-[10px] text-muted-foreground">
          Barras coloridas pelo ROAS do período (verde = eficiente, vermelho = crítico). Fonte: base diária de KPIs (INV_PADS, TGMV_LC_PADS, TGMV_LC).
        </div>
      </div>

      {/* ── Tabela por período ───────────────────────────────────────── */}
      {serie.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border/40 bg-card/60">
          <table className="w-full text-xs">
            <thead className="border-b border-border/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Período</th>
                <th className="px-3 py-2 text-right font-medium">Investimento</th>
                <th className="px-3 py-2 text-right font-medium">GMV Ads</th>
                <th className="px-3 py-2 text-right font-medium">Pedidos Ads</th>
                <th className="px-3 py-2 text-right font-medium">ROAS</th>
                <th className="px-3 py-2 text-right font-medium">ACOS</th>
                <th className="px-3 py-2 text-right font-medium">TACOS</th>
              </tr>
            </thead>
            <tbody>
              {serie
                .slice()
                .reverse()
                .map((b) => (
                  <tr key={b.key} className="border-b border-border/20 last:border-0">
                    <td className="px-3 py-2 text-foreground">{b.label}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtBRL(b.inv)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtBRL(b.gmv_ads)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{b.tsi_ads.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums" style={{ color: corRoas(b.roas) }}>
                      {b.roas.toFixed(2)}x
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{b.acos.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{b.tacos.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Produtos mais vendidos ───────────────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Produtos mais vendidos no período
          </span>
          <TooltipInfo text="Ranking por pedidos dos últimos 7 dias (base de elegibilidade). O feed do Mercado Livre não quebra o investimento em Ads por item — por isso a coluna de desconto e o status de campanha servem como leitura do esforço promocional por produto." />
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          O investimento em Ads não é exportado por anúncio no feed diário; este ranking mostra os itens que puxam o volume e se estão em campanha.
        </p>

        {loadingProdutos ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando produtos…</div>
        ) : produtos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sem itens na base de elegibilidade para o intervalo selecionado.
          </div>
        ) : (
          <div className="space-y-2">
            {produtos.map((p) => (
              <div key={p.item_id} className="rounded-lg border border-border/30 bg-background/30 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={`https://produto.mercadolivre.com.br/MLB-${String(p.item_id).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[70%] truncate text-xs font-medium text-primary hover:underline"
                    title={p.item_name}
                  >
                    {p.item_name}
                  </a>
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    {p.pedidos_7d.toLocaleString("pt-BR")} ped./7d
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(p.pedidos_7d / maxPedidos) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{p.tsi_dia.toFixed(1)} pedidos/dia</span>
                  <span>Desconto total: {p.desconto_total.toFixed(1)}%</span>
                  <span
                    className="rounded-full border px-2 py-0.5"
                    style={{
                      borderColor: p.em_campanha ? "#29A084" : "#D97706",
                      color: p.em_campanha ? "#29A084" : "#D97706",
                    }}
                  >
                    {p.em_campanha ? "Em campanha" : "Fora de campanha"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function Mini({ titulo, valor, cor, rodape }: { titulo: string; valor: string; cor?: string; rodape?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums" style={cor ? { color: cor } : undefined}>
        {valor}
      </div>
      {rodape && <div className="mt-0.5 text-[10px] text-muted-foreground">{rodape}</div>}
    </div>
  );
}

export default AdsGranularidadePanel;
