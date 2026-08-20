import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PockFullMes } from "@/hooks/usePockData";

interface Props {
  dados: PockFullMes[];
  /** cobertura do TGMV_LC_FBM em % dos meses */
  coberturaFbm?: number;
  /** meta do programa em % (opcional) */
  meta?: number | null;
}

function rotuloMes(mes: string) {
  const [a, m] = mes.split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(m) - 1]}/${a.slice(2)}`;
}

export default function PockAdesaoFull({ dados, coberturaFbm, meta = null }: Props) {
  const linhas = useMemo(
    () =>
      dados.map((d) => {
        const temItens = d.itensFull !== null && d.itensForaFull !== null;
        const total = temItens ? (d.itensFull ?? 0) + (d.itensForaFull ?? 0) : 0;
        return {
          mes: rotuloMes(d.mes),
          dentro: temItens && total > 0 ? ((d.itensFull ?? 0) / total) * 100 : temItens ? 0 : null,
          fora: temItens && total > 0 ? ((d.itensForaFull ?? 0) / total) * 100 : temItens ? 100 : null,
          gmvFull: d.pctGmvFull,
        };
      }),
    [dados],
  );

  const temItens = linhas.some((l) => l.dentro !== null);
  const fullNaoAtivado =
    temItens && linhas.every((l) => (l.dentro ?? 0) === 0) ;
  const temGmv = linhas.some((l) => l.gmvFull !== null);
  const ultimoGmv = [...linhas].reverse().find((l) => l.gmvFull !== null)?.gmvFull ?? null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-[13px] font-semibold">Adesão ao FULL — itens e faturamento</h4>
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Como ler a adesão ao FULL" className="text-muted-foreground hover:text-foreground shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[320px] leading-relaxed space-y-1.5">
                <p><span className="font-semibold">O que mostra: </span>a fatia dos itens que está no FULL e a fatia do faturamento que sai pelo FULL.</p>
                <p><span className="font-semibold">Unidade: </span>% (itens e faturamento do mês).</p>
                <p><span className="font-semibold">Como ler: </span>quando a linha do faturamento fica acima da área de itens, o FULL está concentrado nos produtos de maior valor. Quando fica abaixo, há muito item no FULL girando pouco dinheiro.</p>
                <p><span className="font-semibold">Base insuficiente: </span>onde falta cobertura de faturamento a linha é interrompida; a área de itens continua.</p>
              </TooltipContent>
            </UiTooltip>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            A distância entre a linha e a área é a leitura: linha acima da área significa que o FULL
            está nos itens de maior valor.
          </p>
        </div>
        {fullNaoAtivado && (
          <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground shrink-0">
            FULL não ativado neste período
          </span>
        )}
      </div>

      <div className="h-[260px] lg:h-[300px]">
        {!temItens && !temGmv ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 gap-1">
            <p className="text-xs font-medium">Sem dados de adesão ao FULL nesta loja</p>
            <p className="text-[10px] text-muted-foreground max-w-[280px]">
              Nenhum mês tem itens no FULL nem faturamento por Fulfillment registrado.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={linhas} margin={{ top: 20, right: 40, left: 0, bottom: 0 }} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={14} angle={-35} textAnchor="end" height={40} tickMargin={4} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                width={40}
                tickCount={5}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: any, name: any) => [
                  v === null || v === undefined ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
                  name,
                ]}
              />
              {temItens && (
                <>
                  <Area
                    type="linear"
                    dataKey="dentro"
                    name="Itens no FULL"
                    stackId="itens"
                    stroke="hsl(var(--brand-blue))"
                    fill="hsl(var(--brand-blue))"
                    fillOpacity={0.5}
                    isAnimationActive={false}
                  />
                  <Area
                    type="linear"
                    dataKey="fora"
                    name="Itens fora do FULL"
                    stackId="itens"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.25}
                    isAnimationActive={false}
                  />
                </>
              )}
              {meta != null && (
                <ReferenceLine
                  y={meta}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 3"
                  label={{ value: `meta ${meta}%`, position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
              )}
              <Line
                type="linear"
                dataKey="gmvFull"
                name="% do GMV via FULL"
                stroke="hsl(var(--brand-purple))"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="gmvFull"
                  position="right"
                  style={{ fontSize: 9, fill: "hsl(var(--brand-purple))" }}
                  formatter={(v: any, _e?: any, i?: number) =>
                    v != null && v === ultimoGmv ? `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : ""
                  }
                />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground tnum">
        {!temItens
          ? "Itens dentro/fora do FULL não estão disponíveis na base agregada — só a linha de faturamento é exibida. "
          : ""}
        {coberturaFbm !== undefined
          ? `Cobertura do faturamento por Fulfillment: ${coberturaFbm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos meses; a linha é interrompida nos meses sem cobertura.`
          : "A linha é interrompida nos meses sem cobertura."}
      </p>
    </div>
  );
}
