import { useMemo } from "react";
import type { ReactNode } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { KpiCard } from "@/components/ds";
import { brl, num, pct } from "@/lib/format";
import { adicionarDiasIso, diasInclusive, formatarPeriodoBr } from "@/lib/periodoResumo";

type K = { date: string; gmv?: number; tgmv?: number; revenue?: number; adsInvestment?: number; tgmvPads?: number; visits?: number; tsi?: number };

const soma = (ks: K[], f: (k: K) => number | undefined) => ks.reduce((a, k) => a + (Number(f(k)) || 0), 0);
const variacao = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

function totais(ks: K[]) {
  const tgmv = soma(ks, (k) => k.tgmv || k.gmv);
  const gmv = soma(ks, (k) => k.gmv);
  const ads = soma(ks, (k) => k.adsInvestment);
  const vendasAds = soma(ks, (k) => k.tgmvPads);
  const visitas = soma(ks, (k) => k.visits);
  return {
    tgmv,
    gmv,
    ads,
    visitas,
    roas: ads > 0 ? vendasAds / ads : null,
    cpv: visitas > 0 && ads > 0 ? ads / visitas : null,
    receitaVisita: visitas > 0 ? tgmv / visitas : null,
  };
}

/** Seções 1 e 2 do Resumo: resultado (macro) e tráfego/aquisição (meso). CVR fica só no funil (S4). */
export default function ResumoExecutivo({ diario, de, ate, reputacao }: { diario: K[]; de?: string; ate?: string; reputacao?: ReactNode }) {
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
    return { atual: totais(atual), ant: ant.length ? totais(ant) : null, serie: atual, ini, fim };
  }, [diario, de, ate]);

  if (!d || !d.serie.length) return null;
  const { atual: a, ant: p } = d;
  const v = (x: number | null, y: number | null | undefined) => (x != null && y != null ? variacao(x, y) : null);
  const periodo = formatarPeriodoBr(d.ini, d.fim);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <section aria-label="Resultado da loja" className={reputacao ? 'lg:col-span-8 space-y-3' : 'lg:col-span-12 space-y-3'}>
        <h2 className="text-base font-semibold mb-2">Resumo executivo · {periodo}</h2>
        <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3">
          <KpiCard focal rotulo="TGMV" valor={brl(a.tgmv)} variacao={v(a.tgmv, p?.tgmv)} referencia={p ? `Anterior: ${brl(p.tgmv)}` : "Sem período anterior"} />
          <KpiCard rotulo="GMV faturado" valor={brl(a.gmv)} variacao={v(a.gmv, p?.gmv)} referencia={a.tgmv > 0 ? `${pct((a.gmv / a.tgmv) * 100, 1)} do TGMV` : "Sem dado"} />
          <KpiCard rotulo="Investimento em Ads" valor={brl(a.ads)} variacao={v(a.ads, p?.ads)} melhorQuando="neutro" referencia={p ? `Anterior: ${brl(p.ads)}` : "Sem período anterior"} />
          <KpiCard rotulo="ROAS" valor={a.roas != null ? `${num(a.roas, 2)}x` : "Sem dado"} variacao={v(a.roas, p?.roas)} referencia="Vendas por Ads ÷ investimento" />
        </div>
      </section>
      {reputacao && <div className="lg:col-span-4 min-w-0">{reputacao}</div>}
      </div>

      <section aria-label="Tráfego e aquisição" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="ds-glass-surface rounded-2xl p-5 lg:col-span-8 min-w-0">
          <h2 className="ds-rotulo mb-3">2 · Investimento em Ads × visitas · {periodo}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.serie.map((k) => ({ dia: k.date.slice(8, 10) + "/" + k.date.slice(5, 7), ads: Number(k.adsInvestment) || 0, visitas: Number(k.visits) || 0 }))}>
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
        <div className="grid grid-cols-1 gap-3 lg:col-span-4">
          <KpiCard rotulo="Visitas totais" valor={num(a.visitas)} variacao={v(a.visitas, p?.visitas)} referencia={p ? `Anterior: ${num(p.visitas)}` : "Sem período anterior"} />
          <KpiCard rotulo="Custo por visita" valor={a.cpv != null ? brl(a.cpv, true) : "Sem dado"} variacao={v(a.cpv, p?.cpv)} melhorQuando="descer" referencia="Investimento ÷ visitas" />
          <KpiCard rotulo="Receita por visita" valor={a.receitaVisita != null ? brl(a.receitaVisita, true) : "Sem dado"} variacao={v(a.receitaVisita, p?.receitaVisita)} referencia="TGMV ÷ visitas · CVR no funil" />
        </div>
      </section>
    </div>
  );
}
