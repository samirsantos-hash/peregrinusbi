import { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Shield, Video } from 'lucide-react';
import { KpiCard } from '@/components/ds';
import { num, brl, pct } from '@/lib/format';
import { conversaoClips, scoreMedido, qualidadeConfirmavel, type EvidenciaQualidadeClips } from '@/lib/qualidadeClips';
import TooltipInfo from './TooltipInfo';

interface Props {
  kpis: { date: string; evidenciaQualidadeClips?: EvidenciaQualidadeClips }[];
  sellerCustIdMap?: Record<string, string>;
}
const dimensions = [
  ['fotos', 'Fotos'], ['titulo', 'Título'], ['descricao', 'Descrição'],
  ['preco', 'Preço'], ['frete', 'Frete grátis'], ['promocoes', 'Promoções'],
] as const;

export default function QualityRadarPanel({ kpis }: Props) {
  const latest = useMemo(() => [...kpis].sort((a, b) => b.date.localeCompare(a.date))[0], [kpis]);
  const evidence = latest?.evidenciaQualidadeClips;
  const confirmed = qualidadeConfirmavel(evidence);
  const data = dimensions.map(([key, label]) => ({ dimension: label, value: confirmed ? scoreMedido(evidence?.[key] ?? null) : null }));
  const measured = data.filter(d => d.value != null);
  const complete = measured.length === dimensions.length;
  const conversion = conversaoClips(evidence?.visitas ?? null, evidence?.pedidos ?? null);
  const date = latest?.date ? new Date(`${latest.date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('pt-BR') : null;
  const reference = date ? `Planilha · medição de ${date} · sem comparação anterior` : 'Sem medição no período';
  return <section className="space-y-6" aria-label="Qualidade e resultados de Clips">
    <div className="border-b border-border pb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Qualidade dos anúncios
        <TooltipInfo text="Pontuações técnicas e comerciais importadas, na última medição do período selecionado. Não medem a qualidade do vídeo. Sem índice agregado: alcançar metas de Clips não comprova qualidade técnica." />
      </h3>
      <span className="text-sm text-muted-foreground">{num(measured.length)} de 6 dimensões medidas{date ? ` · ${date}` : ''}</span>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
      {complete ? <div className="h-[320px] sm:h-[360px] w-full min-w-0" aria-label="Radar de qualidade medida">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="65%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill:'hsl(var(--muted-foreground))', fontSize:13 }} />
            <PolarRadiusAxis domain={[0,100]} tick={{fill:'hsl(var(--muted-foreground))',fontSize:11}} />
            <Radar name="Pontuação importada" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} dot isAnimationActive={false} />
            <Tooltip formatter={(v: number) => [`${num(v, 1)}/100`, 'Pontuação importada']} contentStyle={{background:'hsl(var(--card))',borderColor:'hsl(var(--border))',color:'hsl(var(--foreground))'}} />
          </RadarChart>
        </ResponsiveContainer>
      </div> : <div className="min-h-[180px] border-l-2 border-border pl-5 flex flex-col justify-center gap-2">
        <Shield className="w-7 h-7 text-muted-foreground" />
        <p className="text-lg font-semibold">{measured.length ? 'Medição de qualidade incompleta' : 'Sem dados de qualidade nesta medição'}</p>
        <p className="text-sm text-muted-foreground">{measured.length ? 'As dimensões disponíveis estão ao lado; as ausentes não recebem nota zero.' : 'As pontuações estão ausentes ou todas zeradas na importação, sem comprovação de avaliação. Isso não classifica os anúncios como críticos.'}</p>
      </div>}
      <div className="divide-y divide-border border-y border-border">
        {data.map(d => <div key={d.dimension} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
          <span>{d.dimension}</span><span className="tabular-nums font-semibold">{d.value == null ? 'Sem medição' : `${num(d.value,1)}/100`}</span>
        </div>)}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <Video className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Resultados atribuídos a Clips</h3>
      <TooltipInfo text="Resultados da loja na última medição importada do período selecionado, não de um vídeo individual. Pedidos e unidades são distintos. Conversão = pedidos via Clips ÷ visitas via Clips × 100. Contagem de publicações não exibida: o histórico contém zeros de preenchimento sem comprovação." />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard rotulo="Visitas via Clips" valor={evidence?.visitas == null ? 'Sem medição' : num(evidence.visitas)} referencia={reference} />
      <KpiCard rotulo="Pedidos via Clips" valor={evidence?.pedidos == null ? 'Sem medição' : num(evidence.pedidos)} referencia={<>{reference}<br />{evidence?.unidades == null ? 'Unidades não informadas' : `${num(evidence.unidades)} unidades vendidas`}</>} />
      <KpiCard rotulo="Conversão via Clips" valor={conversion == null ? 'Sem medição' : pct(conversion,2)} referencia={<>{reference}<br />Pedidos ÷ visitas via Clips</>} />
      <KpiCard rotulo="Faturamento via Clips" valor={evidence?.faturamento == null ? 'Sem medição' : brl(evidence.faturamento,true)} referencia={reference} />
    </div>
  </section>;
}
