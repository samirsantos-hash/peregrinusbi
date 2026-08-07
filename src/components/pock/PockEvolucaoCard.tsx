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
import { Info } from "lucide-react";
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
  /** rótulo "derivado" com a fórmula */
  derivadoFormula?: string;
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
  derivadoFormula,
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

  const semDado = dados.every((d) => d.valor === null);

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card/40">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-xs font-semibold truncate">{titulo}</h4>
          {derivadoFormula && (
            <UiTooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[9px] rounded-full border border-border px-1.5 py-0.5 text-muted-foreground">
                  <Info className="w-2.5 h-2.5" /> derivado
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[260px]">{derivadoFormula}</TooltipContent>
            </UiTooltip>
          )}
        </div>
        {extra && <span className="text-[10px] text-muted-foreground tnum">{extra}</span>}
      </div>

      <div className="h-[190px]">
        {semDado ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">—</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dados} margin={{ top: 14, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={38} />
              <YAxis
                yAxisId="v"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <YAxis
                yAxisId="p"
                orientation="right"
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                }}
                formatter={(v: any, name: any) =>
                  name === "Var. YOY" || name === "Var. MOM"
                    ? [`${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, name]
                    : [fmt(v, formato), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="v" dataKey="anoAnterior" name="Ano anterior" fill="hsl(var(--brand-blue))" fillOpacity={0.3} radius={[3, 3, 0, 0]} />
              <Bar yAxisId="v" dataKey="valor" name="Mês" fill="hsl(var(--brand-blue))" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="valor"
                  position="top"
                  style={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  formatter={(v: any) => (v == null ? "" : fmt(v, formato))}
                />
              </Bar>
              {/* série interrompida em mês sem dado: connectNulls=false */}
              <Line yAxisId="p" type="monotone" dataKey="yoy" name="Var. YOY" stroke="hsl(var(--brand-purple))" strokeWidth={1.6} strokeDasharray="5 3" dot={false} connectNulls={false} />
              <Line yAxisId="p" type="monotone" dataKey="mom" name="Var. MOM" stroke="hsl(var(--brand-purple))" strokeOpacity={0.45} strokeWidth={1.4} dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground tnum">
        {cobertura !== undefined
          ? `Cobertura do dado: ${cobertura.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos meses · série interrompida onde não há dado`
          : "Série interrompida onde não há dado"}
      </p>
    </div>
  );
}