import type { ReactNode } from "react";
import ResumoExecutivo from "@/components/dashboard/ResumoExecutivo";
import ClipsResumo from "@/components/dashboard/ClipsResumo";
import FunilResumoReal from "@/components/dashboard/FunilResumoReal";
import ResumoReputacao from "@/components/dashboard/ResumoReputacao";
import OperacaoResumo from "@/components/dashboard/OperacaoResumo";
import DailyPerformanceChart from "@/components/dashboard/DailyPerformanceChart";
import GmvMesVsMes from "@/components/charts/GmvMesVsMes";
import TrendAnalysisPanel from "@/components/dashboard/TrendAnalysisPanel";
import BotaoConexaoMl from "@/components/ml/BotaoConexaoMl";
import GrowthPotentialPanel from "@/components/dashboard/GrowthPotentialPanel";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { ListingQuality } from "@/hooks/useListingsQuality";
import type { EligibilityItem } from "@/hooks/useEligibility";

function Bloco({
  n,
  titulo,
  periodo,
  porque,
  children,
}: {
  n: number;
  titulo: string;
  periodo?: string;
  porque?: string;
  children: ReactNode;
}) {
  return (
    <section className="painel-bloco" aria-label={`${n}. ${titulo}`}>
      <header className="painel-bloco-cabeca">
        <h2 className="ds-rotulo">
          {n} · {titulo}
          {periodo ? ` · ${periodo}` : ""}
        </h2>

      </header>
      <div className="painel-bloco-corpo">{children}</div>
    </section>
  );
}

type Props = {
  diario: SellerKPI[];
  de?: string;
  ate?: string;
  periodo?: string;
  listingsQuality?: ListingQuality[];
  eligibilityItems?: EligibilityItem[];
  serieGmv: { date: string; gmv: number }[];
  campaign?: unknown;
  benchmark?: unknown;
  sellerId?: string;
  dataGranularity?: "consolidated" | "daily";
  custId?: string;
};

/**
 * Visão geral unificada (Resumo + Faturamento).
 * Cadeia: efeito → tráfego → ritmo → canal → funil → operação (reputação/envios) → sazonalidade → Ads×GMV → potencial.
 * Sem repetir big numbers de GMV/Ads/ROAS fora do bloco 1–2.
 */
export default function VisaoGeralSecao({
  diario,
  de,
  ate,
  periodo,
  listingsQuality,
  eligibilityItems,
  serieGmv,
  campaign,
  benchmark,
  sellerId,
  dataGranularity = "daily",
  custId,
}: Props) {
  return (
    <div className="visao-geral-modulo space-y-8">
      <header className="painel-apple-hero">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="ds-rotulo">Visão geral</p>
          <BotaoConexaoMl custId={custId} />
        </div>
        <h2 className="text-xl font-semibold">Resultado, causas e tendências</h2>
        {periodo && <p className="text-xs text-muted-foreground">Histórico importado · {periodo}</p>}
      </header>

      {/* 1 · Resultado + 2 · Tráfego (efeito e causa imediata) — uma única fonte de TGMV/Ads/ROAS */}
      <ResumoExecutivo diario={diario as any} de={de} ate={ate} reputacao={(() => {
        const ultimo = [...diario].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
        return <ResumoReputacao dados={ultimo ? { nivel: ultimo.repLevel, reclamacoes: ultimo.repClaimsRate, atrasos: ultimo.repDelayedRate, cancelamentos: ultimo.repCancellationsRate } : null} atualizadoEm={ultimo?.date} />;
      })()} />


      <Bloco
        n={3}
        titulo="Ritmo diário"
        periodo={periodo}
        porque="Série temporal do efeito: faturamento e Ads no ciclo de 24h. Use Essencial para ler sem poluição."
      >
        <div className="painel-vidro overflow-hidden rounded-2xl">
          <DailyPerformanceChart kpis={diario as any} granularity="daily" />
        </div>
      </Bloco>


      <Bloco n={4} titulo="Clips & vídeo" periodo={periodo} porque="Canal micro: contribuição ao TGMV. A CVR oficial permanece só no funil.">
        <ClipsResumo
          kpis={diario}
          listingsQuality={listingsQuality}
          eligibilityItems={eligibilityItems}
          periodo={periodo}
          indice={4}
          ocultarTitulo
        />
      </Bloco>


      <Bloco n={5} titulo="Funil de conversão" periodo={periodo} porque="Onde a loja perde compradores — diagnóstico operacional.">
        <FunilResumoReal visitas={diario.reduce((s, k) => s + (Number(k.visits) || 0), 0)} vendas={diario.reduce((s, k) => s + (Number(k.tsi) || 0), 0)} unidade="Unidades vendidas" />
      </Bloco>


      <Bloco
        n={6}
        titulo="Envios e logística"
        porque="Principais KPIs operacionais: termômetro, reclamações, atrasos, cancelamentos e participação Full/Flex/Agência."
      >
        <OperacaoResumo diario={diario as any} somenteLogistica />
      </Bloco>


      <Bloco n={7} titulo="GMV mês vs mês" porque="Comparação anual do faturamento — contexto de sazonalidade.">
        <div className="painel-vidro rounded-2xl p-2">
          <GmvMesVsMes pontos={serieGmv} titulo="GMV mês vs mês (comparação anual)" />
        </div>
      </Bloco>


      <Bloco n={8} titulo="Diagnóstico Ads × GMV" porque="Correlação e elasticidade entre investimento e faturamento.">
        <div className="painel-vidro overflow-hidden rounded-2xl">
          <TrendAnalysisPanel
            kpis={diario as any}
            dataGranularity={dataGranularity}
            allKpisDaily={diario as any}
          />
        </div>
      </Bloco>

      <Bloco n={9} titulo="Potencial de crescimento" porque="Referência da vertical — quanto a loja ainda pode crescer frente aos pares.">
        <div className="painel-vidro overflow-hidden rounded-2xl">
          <GrowthPotentialPanel
            kpis={diario as any}
            dataGranularity={dataGranularity}
            campaign={campaign as any}
            benchmark={benchmark as any}
            sellerId={sellerId}
          />
        </div>
      </Bloco>
    </div>
  );
}
