import { useMemo } from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { KpiCard } from "@/components/ds";
import { brl, num, pct } from "@/lib/format";

type K = { date: string; gmv?: number; tgmv?: number; revenue?: number; adsInvestment?: number; tgmvPads?: number; visits?: number; tsi?: number };

const soma = (ks: K[], f: (k: K) => number | undefined) => ks.reduce((a, k) => a + (Number(f(k)) || 0), 0);
const variacao = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

function totais(ks: K[]) {
  const tgmv = soma(ks, (k) => k.tgmv || k.gmv);
  const gmv = soma(ks, (k) => k.gmv);
  const ads = soma(ks, (k) => k.adsInvestment);
  const vendasAds = soma(ks, (k) => k.tgmvPads);
  const visitas = soma(ks, (k) => k.visits);
  const unidades = soma(ks, (k) => k.tsi);
  return {
    tgmv, gmv, ads, visitas,
    roas: ads > 0 ? vendasAds / ads : null,
    cpv: visitas > 0 && ads > 0 ? ads / visitas : null,
    conv: visitas > 0 ? unidades / visitas : null,
  };
}

/** Seções 1 e 2 do Resumo: resultado (macro) e tráfego/aquisição (meso). Período anterior = mesma duração imediatamente antes. */
export default function ResumoExecutivo({ diario, de, ate }: { diario: K[]; de?: string; ate?: string }) {
  const d = useMemo(() => {
    const ord = [...diario].filter((k) => k.date).sort((a, b) => a.date.localeCompare(b.date));
    if (!ord.length) return null;
    const fim = (ate ?? ord[ord.length - 1].date).slice(0, 10);
    const ini = (de ?? ord[Math.max(0, ord.length - 30)].date).slice(0, 10);
    const dias = Math.round((Date.parse(fim) - Date.parse(ini)) / 864e5) + 1;
    const antFim = new Date(Date.parse(ini) - 864e5).toISOString().slice(0, 10);
    const antIni = new Date(Date.parse(ini) - dias * 864e5).toISOString().slice(0, 10);
    const atual = ord.filter((k) => k.date.slice(0, 10) >= ini && k.date.slice(0, 10) <= fim);
    const ant = ord.filter((k) => k.date.slice(0, 10) >= antIni && k.date.slice(0, 10) <= antFim);
    return { atual: totais(atual), ant: ant.length ? totais(ant) : null, serie: atual, ini, fim };
  }, [diario, de, ate]);

  if (!d || !d.serie.length) return null;
  const { atual: a, ant: p } = d;
  const v = (x: number | null, y: number | null | undefined) => (x != null && y != null ? variacao(x, y) : null);
  const periodo = `${d.ini.split("-").reverse().join("/")} a ${d.fim.split("-").reverse().join("/")}`;

  return (
    <div className="space-y-5">
      <section aria-label="Resultado da loja">
        <h2 className="ds-rotulo mb-2">1 · Resultado da loja · {periodo}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard focal rotulo="TGMV" valor={brl(a.tgmv)} variacao={v(a.tgmv, p?.tgmv)} referencia={p ? `Anterior: ${brl(p.tgmv)}` : "Sem período anterior"} />
          <KpiCard rotulo="GMV faturado" valor={brl(a.gmv)} variacao={v(a.gmv, p?.gmv)} referencia={a.tgmv > 0 ? `${pct((a.gmv / a.tgmv) * 100, 1)} do TGMV` : "Sem dado"} />
          <KpiCard rotulo="Investimento em Ads" valor={brl(a.ads)} variacao={v(a.ads, p?.ads)} melhorQuando="neutro" referencia={p ? `Anterior: ${brl(p.ads)}` : "Sem período anterior"} />
          <KpiCard rotulo="ROAS" valor={a.roas != null ? `${num(a.roas, 2)}x` : "Sem dado"} variacao={v(a.roas, p?.roas)} referencia="Vendas por Ads ÷ investimento" />
        </div>
      </section>

      <section aria-label="Tráfego e aquisição" className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ds-kpi rounded-2xl p-5 lg:col-span-2 min-w-0">
          <h2 className="ds-rotulo mb-3">2 · Investimento em Ads × visitas por dia</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.serie.map((k) => ({ dia: k.date.slice(8, 10) + "/" + k.date.slice(5, 7), ads: Number(k.adsInvestment) || 0, visitas: Number(k.visits) || 0 }))}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="v" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={44} />
                <YAxis yAxisId="a" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={56} />
                <Tooltip formatter={(val: number, n: string) => (n === "ads" ? [brl(val), "Investimento"] : [num(val), "Visitas"])} />
                <Area yAxisId="v" type="monotone" dataKey="visitas" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                <Line yAxisId="a" type="monotone" dataKey="ads" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <KpiCard rotulo="Visitas totais" valor={num(a.visitas)} variacao={v(a.visitas, p?.visitas)} referencia={p ? `Anterior: ${num(p.visitas)}` : "Sem período anterior"} />
          <KpiCard rotulo="Custo por visita" valor={a.cpv != null ? brl(a.cpv, true) : "Sem dado"} variacao={v(a.cpv, p?.cpv)} melhorQuando="descer" referencia="Investimento ÷ visitas" />
          <KpiCard rotulo="Conversão global" valor={a.conv != null ? pct(a.conv * 100, 2) : "Sem dado"} variacao={v(a.conv, p?.conv)} referencia="Unidades ÷ visitas" />
        </div>
      </section>
    </div>
  );
}
