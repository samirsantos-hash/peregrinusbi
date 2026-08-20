import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { Info, AlertTriangle } from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Formato = "moeda" | "numero" | "percent";

export interface PontoEvolucao {
  mes: string; // YYYY-MM-01
  valor: number | null;
}

interface Props {
  titulo: string;
  pontos: PontoEvolucao[];
  formato?: Formato;
  /** 0–100 */
  cobertura?: number;
  /** unidade exibida no tooltip padrão (ex.: "R$ (reais)", "% do faturamento") */
  unidade?: string;
  /** origem didática do número quando ele é calculado a partir de outros dados */
  derivado?: string;
  /** o que o gráfico mostra, em linguagem simples */
  oQueMostra?: string;
  /** como interpretar o resultado */
  comoLer?: string;
  extra?: string;
}

function fmt(v: number | null | undefined, formato: Formato): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (formato === "moeda")
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (formato === "percent")
    return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function rotuloMes(mes: string) {
  const [a, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${a.slice(2)}`;
}

export default function PockEvolucaoCard({
  titulo,
  pontos,
  formato = "numero",
  cobertura,
  unidade,
  derivado,
  oQueMostra,
  comoLer,
  extra,
}: Props) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  const dados = useMemo(() => {
    const mapa = new Map(pontos.map((p) => [p.mes, p.valor]));
    return pontos.map((p, i) => {
      const [ano, mes] = p.mes.split("-");
      const anterior = mapa.get(`${Number(ano) - 1}-${mes}-01`) ?? null;
      const prev = i > 0 ? pontos[i - 1].valor : null;
      const yoy =
        p.valor !== null && anterior !== null && anterior !== 0
          ? ((p.valor - anterior) / Math.abs(anterior)) * 100
          : null;
      const mom =
        p.valor !== null && prev !== null && prev !== 0
          ? ((p.valor - prev) / Math.abs(prev)) * 100
          : null;
      return {
        mes: rotuloMes(p.mes),
        futuro: p.mes > mesAtual,
        valor: p.valor,
        anoAnterior: anterior,
        yoy,
        mom,
      };
    });
  }, [pontos, mesAtual]);

  const mesesComDado = dados.filter((d) => d.valor !== null).length;
  const semDado = mesesComDado === 0;
  const baseInsuficiente = !semDado && (mesesComDado < 3 || (cobertura !== undefined && cobertura < 50));
  // rótulos só quando há espaço: séries curtas evitam sobreposição de números
  const mostrarRotulos = dados.length <= 8;

  const unidadeTexto =
    unidade ?? (formato === "moeda" ? "R$ (reais)" : formato === "percent" ? "% (percentual)" : "quantidade");

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card/40">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-[13px] font-semibold truncate">{titulo}</h4>
          {(oQueMostra || comoLer) && (
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Como ler: ${titulo}`}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[320px] leading-relaxed space-y-1.5">
                {oQueMostra && (
                  <p>
                    <span className="font-semibold">O que mostra: </span>
                    {oQueMostra}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Unidade: </span>
                  {unidadeTexto}
                </p>
                {derivado && (
                  <p>
                    <span className="font-semibold">Como é obtido: </span>
                    {derivado}
                  </p>
                )}
                {comoLer && (
                  <p>
                    <span className="font-semibold">Como ler: </span>
                    {comoLer}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Base insuficiente: </span>
                  meses sem informação ficam vazios e a linha é interrompida; com menos de 3 meses
                  medidos as comparações de variação podem não aparecer.
                </p>
              </TooltipContent>
            </UiTooltip>
          )}
          {derivado && (
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[10px] rounded-full border border-border px-1.5 py-0.5 text-muted-foreground">
                  <Info className="w-2.5 h-2.5" /> derivado
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[260px]">{derivado}</TooltipContent>
            </UiTooltip>
          )}
          {baseInsuficiente && (
            <span className="inline-flex items-center gap-1 text-[10px] rounded-full border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-warn">
              <AlertTriangle className="w-2.5 h-2.5" /> base insuficiente
            </span>
          )}
        </div>
        {extra && <span className="text-[11px] text-muted-foreground tnum">{extra}</span>}
      </div>

      <div className="h-[260px] lg:h-[300px] xl:h-[330px]">
        {semDado ? (
          <div className="h-full flex flex-col items-center justify-center gap-1 text-center px-4">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium">Sem dados suficientes para montar este gráfico</p>
            <p className="text-[10px] text-muted-foreground max-w-[260px]">
              Nenhum mês da loja tem informação de {titulo.toLowerCase()} ({unidadeTexto}). Assim que
              a base for atualizada com esses meses, o gráfico aparece automaticamente.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={14}
                angle={-35}
                textAnchor="end"
                height={40}
                tickMargin={4}
              />
              <YAxis
                yAxisId="v"
                tick={{ fontSize: 10 }}
                width={46}
                tickCount={5}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : Math.abs(v) >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : `${v}`
                }
              />
              <YAxis
                yAxisId="p"
                orientation="right"
                tick={{ fontSize: 10 }}
                width={40}
                tickCount={5}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
                formatter={(v: any, name: any) =>
                  name === "Var. YOY" || name === "Var. MOM"
                    ? [`${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, name]
                    : [fmt(v, formato), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} iconSize={8} />
              <Bar yAxisId="v" dataKey="anoAnterior" name="Ano anterior" fill="hsl(var(--brand-blue))" fillOpacity={0.3} radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar yAxisId="v" dataKey="valor" name="Mês" fill="hsl(var(--brand-navy))" radius={[3, 3, 0, 0]} maxBarSize={18}>
                {mostrarRotulos && (
                  <LabelList
                    dataKey="valor"
                    position="top"
                    style={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    formatter={(v: any) => (v == null ? "" : fmt(v, formato))}
                  />
                )}
              </Bar>
              {/* série interrompida em mês sem dado: connectNulls=false */}
              <Line yAxisId="p" type="monotone" dataKey="yoy" name="Var. YOY" stroke="hsl(var(--brand-navy))" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
              <Line yAxisId="p" type="monotone" dataKey="mom" name="Var. MOM" stroke="hsl(var(--brand-navy))" strokeOpacity={0.5} strokeWidth={1.6} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground tnum">
        {`Unidade: ${unidadeTexto} · `}
        {cobertura !== undefined
          ? `cobertura do dado: ${cobertura.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos meses · `
          : ""}
        {baseInsuficiente
          ? "base insuficiente: poucos meses medidos, leia as variações com cautela"
          : "série interrompida onde não há dado"}
      </p>
    </div>
  );
}