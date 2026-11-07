import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { ArrowRightLeft, ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { brlCurto, delta, numCurto } from "@/lib/format";
import { totalPeriodo, variacaoPeriodos, type DiaComparacao, type IntervaloComparacao, type MetricaComparacao } from "@/lib/comparacaoPeriodos";

interface Props { sellerId: string; de?: string; ate?: string; ultimaData?: string }
const metricas: { campo: MetricaComparacao; nome: string }[] = [
  { campo: "tgmv_lc", nome: "Faturamento" },
  { campo: "visits", nome: "Visitas" },
  { campo: "tsi", nome: "Unidades vendidas" },
];

export default function ComparacaoPeriodos({ sellerId, de, ate, ultimaData }: Props) {
  const fim = ate || ultimaData || format(addDays(new Date(), -1), "yyyy-MM-dd");
  const inicio = de || format(addDays(parseISO(fim), -29), "yyyy-MM-dd");
  const dias = totalPeriodo([], { de: inicio, ate: fim }).dias || 30;
  const [b, setB] = useState<IntervaloComparacao>({ de: inicio, ate: fim });
  const [a, setA] = useState<IntervaloComparacao>({
    de: format(addDays(parseISO(inicio), -dias), "yyyy-MM-dd"),
    ate: format(addDays(parseISO(inicio), -1), "yyyy-MM-dd"),
  });
  const validos = totalPeriodo([], a).valido && totalPeriodo([], b).valido;
  const { data = [], isFetching, error, refetch } = useQuery({
    queryKey: ["comparacao-periodos", sellerId, a.de, a.ate, b.de, b.ate],
    enabled: !!sellerId && validos,
    queryFn: async () => {
      const intervalos = [a, b].sort((x, y) => x.de.localeCompare(y.de));
      const resultados = await Promise.all(intervalos.map(intervalo => fetchAllRows<DiaComparacao>((from, to) =>
        (supabase as any).from("sellers_kpi_daily").select("data,tgmv_lc,visits,tsi")
          .eq("seller_id", sellerId).gte("data", intervalo.de).lte("data", intervalo.ate)
          .order("data").order("id").range(from, to),
      )));
      for (const resultado of resultados) if (resultado.error) throw resultado.error;
      return Array.from(new Map(resultados.flatMap(r => r.data).map(d => [d.data, d])).values());
    },
  });
  const totalA = totalPeriodo(data, a);
  const totalB = totalPeriodo(data, b);
  const pronto = validos && !isFetching && !error;

  return (
    <section className="comparacao-periodos space-y-5 border-t border-border pt-6" aria-labelledby="comparacao-periodos-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="comparacao-periodos-titulo" className="ds-titulo-bloco">Comparação entre períodos</h2>
        <Button variant="outline" size="sm" onClick={() => { setA(b); setB(a); }} className="gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Inverter períodos
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {([{ nome: "A", intervalo: a, alterar: setA }, { nome: "B", intervalo: b, alterar: setB }]).map(({ nome, intervalo, alterar }) => (
          <fieldset key={nome} className="min-w-0 space-y-3">
            <legend className="font-medium text-foreground">Período {nome}</legend>
            <div className="grid min-w-0 grid-cols-2 gap-3">
              {([{ campo: "de", nomeCampo: "Início" }, { campo: "ate", nomeCampo: "Fim" }] as const).map(({ campo, nomeCampo }) => (
                <label key={campo} className="min-w-0 space-y-1 text-sm text-muted-foreground">
                  <span>{nomeCampo}</span>
                  <Input type="date" aria-label={`${nomeCampo} do período ${nome}`} value={intervalo[campo]}
                    onChange={e => alterar({ ...intervalo, [campo]: e.target.value })} className="min-w-0 max-w-full" />
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{totalPeriodo([], intervalo).dias || "—"} dias</p>
          </fieldset>
        ))}
      </div>
      {!validos && <p role="alert" className="text-destructive">Selecione início e fim válidos; o fim não pode ser anterior ao início.</p>}
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-destructive">Não foi possível carregar a comparação.<Button variant="outline" size="sm" onClick={() => void refetch()}>Tentar novamente</Button></div>}
      <div aria-live="polite" aria-busy={isFetching} className="min-w-0">
        <table className="w-full table-fixed text-left">
          <caption className="pb-3 text-left text-sm text-muted-foreground">Histórico diário importado · {isFetching ? "Carregando…" : "Variação de B em relação a A"}</caption>
          <thead><tr><th className="w-[30%] px-2 py-3 text-sm font-medium">Indicador</th><th className="px-2 py-3 text-sm font-medium">Período A</th><th className="px-2 py-3 text-sm font-medium">Período B</th></tr></thead>
          <tbody>{metricas.map(({ campo, nome }) => {
            const variacao = pronto ? variacaoPeriodos(totalA, totalB, campo) : null;
            return <tr key={campo} className="border-b border-border">
              <th scope="row" className="px-2 py-5 text-sm font-medium text-foreground">{nome}</th>
              {[totalA, totalB].map((total, i) => {
                const metrica = total.metricas[campo];
                const valor = pronto ? metrica.valor : null;
                return <td key={i} className="px-2 py-5 align-top">
                  <span className="comparacao-periodos-valor block font-medium tabular-nums text-foreground">{campo === "tgmv_lc" ? brlCurto(valor) : numCurto(valor)}</span>
                  {pronto && <span className="mt-1 block text-xs text-muted-foreground">{metrica.completa ? "Completo" : `${metrica.cobertura}/${total.dias} dias · parcial`}</span>}
                  {i === 1 && variacao !== null && <span className={`mt-2 flex items-center gap-1 text-xs tabular-nums ${variacao < 0 ? "text-destructive" : "text-primary"}`}>{variacao < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}{delta(variacao)}</span>}
                </td>;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      {pronto && totalA.dias !== totalB.dias && <p className="text-sm text-muted-foreground">Intervalos com durações diferentes: {totalA.dias} e {totalB.dias} dias. A comparação usa os totais, não médias diárias.</p>}
      <p className="text-xs text-muted-foreground">Dias sem registro não contam como zero; totais parciais incluem apenas os dias disponíveis. Valores zerados no arquivo permanecem como informados. Dados da API não são misturados com este histórico.</p>
    </section>
  );
}