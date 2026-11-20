import { useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { KpiCard } from "@/components/ds";
import { brl, num, pct } from "@/lib/format";
import { adicionarDiasIso, diasInclusive, formatarPeriodoBr } from "@/lib/periodoResumo";
import { SinergiaIndicadores } from "@/components/ml/SinergiaPublicidade";

import { anteriorComparavel, totaisResumo as totais, variacaoPct as variacao, type DiaResumo as K } from "@/lib/resumoExecutivo";

/** Seções 1 e 2 do Resumo: resultado (macro) e tráfego/aquisição (meso). CVR fica só no funil (S4). */
export default function ResumoExecutivo({ diario, de, ate, custId }: { diario: K[]; de?: string; ate?: string; custId?: string }) {
  const d = useMemo(() => {
    const ord = [...diario].filter((k) => k.date).sort((a, b) => a.date.localeCompare(b.date));
    if (!ord.length) return null;
    const fim = (ate ?? ord[ord.length - 1].date).slice(0, 10);
    const ini = (de ?? ord[Math.max(0, ord.length - 30)].date).slice(0, 10);
    const dias = diasInclusive(ini, fim);
    const antFim = adicionarDiasIso(ini, -1);
    const antIni = adicionarDiasIso(ini, -dias);
    const atual = ord.filter((k) => k.date.slice(0, 10) >= ini && k.date.slice(0, 10) <= fim);
    const ant = ord.filter((k) => k.date.slice(0, 10) >= antIni && k.date.slice(0, 10) <= antFim);
    const tA = totais(atual);
    const tP = ant.length ? totais(ant) : null;
    const comparavel = tP != null && anteriorComparavel(tA.dias, tP.dias);
    return { atual: tA, ant: comparavel ? tP : null, antIncompleto: tP != null && !comparavel, serie: atual, ini, fim };
  }, [diario, de, ate]);

  if (!d || !d.serie.length) return null;
  const { atual: a, ant: p } = d;
  const v = (x: number | null, y: number | null | undefined) => variacao(x, y);
  const semAnt = d.antIncompleto ? "Período anterior incompleto" : "Sem período anterior";
  const periodo = formatarPeriodoBr(d.ini, d.fim);

  return (
    <div className="space-y-5">
      <SinergiaIndicadores compacto custId={custId} de={d.ini} ate={d.fim} fonte={`Histórico importado · ${periodo}`} pontos={d.serie.map(k => ({ data: k.date.slice(0, 10), investimento: k.adsInvestment ?? null, faturamento: k.tgmv ?? null, receitaAds: k.tgmvPads ?? null, visitas: k.visitsMedidas === false ? null : k.visits ?? null, cancelamentos: k.repCancellationsRate ?? null }))} />
      <section aria-label="Resultado da loja">
        <h2 className="ds-rotulo mb-2">1 · Resultado da loja · {periodo}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard focal rotulo="TGMV" valor={brl(a.tgmv)} variacao={v(a.tgmv, p?.tgmv)} referencia={p ? `Anterior: ${brl(p.tgmv)}` : semAnt} />
          <KpiCard rotulo="GMV faturado" valor={brl(a.gmv)} variacao={v(a.gmv, p?.gmv)} referencia={a.tgmv > 0 ? `${pct((a.gmv / a.tgmv) * 100, 1)} do TGMV` : "Sem dado"} />
          <KpiCard rotulo="Investimento em Ads" valor={brl(a.ads)} variacao={v(a.ads, p?.ads)} melhorQuando="neutro" referencia={p ? `Anterior: ${brl(p.ads)}` : semAnt} />
          <KpiCard rotulo="ROAS" valor={a.roas != null ? `${num(a.roas, 2)}x` : "Sem dado"} variacao={v(a.roas, p?.roas)} referencia="Vendas por Ads ÷ investimento" />
        </div>
      </section>

      <section aria-label="Tráfego e aquisição" className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ds-kpi rounded-2xl p-5 lg:col-span-2 min-w-0">
          <h2 className="ds-rotulo mb-3">2 · Investimento em Ads × visitas · {periodo}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.serie.map((k) => ({ dia: k.date.slice(8, 10) + "/" + k.date.slice(5, 7), ads: Number(k.adsInvestment) || 0, visitas: k.visitsMedidas === false ? null : Number(k.visits) || 0 }))}>
                <CartesianGrid stroke="hsl(var(--grid))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" />
                <YAxis yAxisId="v" tick={{ fontSize: 11, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" width={44} />
                <YAxis yAxisId="a" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--axis))" }} stroke="hsl(var(--axis))" width={56} />
                <Tooltip formatter={(val: number, n: string) => (n === "ads" ? [brl(val), "Investimento"] : [num(val), "Visitas"])} />
                <Area yAxisId="v" type="monotone" dataKey="visitas" stroke="hsl(var(--series-1))" fill="hsl(var(--series-1) / 0.12)" strokeWidth={2} />
                <Line yAxisId="a" type="monotone" dataKey="ads" stroke="hsl(var(--series-2))" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <KpiCard rotulo="Visitas totais" valor={a.visitas != null ? num(a.visitas) : "Sem dado"} variacao={v(a.visitas, p?.visitas)} referencia={a.diasComVisita < a.dias ? `${a.diasComVisita} de ${a.dias} dias medidos` : p ? `Anterior: ${num(p.visitas ?? 0)}` : semAnt} />
          <KpiCard rotulo="Custo por visita" valor={a.cpv != null ? brl(a.cpv, true) : "Sem dado"} variacao={v(a.cpv, p?.cpv)} melhorQuando="descer" referencia="Investimento ÷ visitas" />
          <KpiCard rotulo="Receita por visita" valor={a.receitaVisita != null ? brl(a.receitaVisita, true) : "Sem dado"} variacao={v(a.receitaVisita, p?.receitaVisita)} referencia={a.diasComVisita < a.dias ? `TGMV ÷ visitas nas ${a.diasComVisita} datas medidas` : "TGMV ÷ visitas · CVR no funil"} />
        </div>
      </section>
    </div>
  );
}
