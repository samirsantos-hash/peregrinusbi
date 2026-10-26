import type { ReactNode } from "react";
import ResumoExecutivo from "@/components/dashboard/ResumoExecutivo";
import ClipsResumo from "@/components/dashboard/ClipsResumo";
import FunilVendas from "@/components/dashboard/FunilVendas";
import OperacaoResumo from "@/components/dashboard/OperacaoResumo";
import DailyPerformanceChart from "@/components/dashboard/DailyPerformanceChart";
import GmvMesVsMes from "@/components/charts/GmvMesVsMes";
import TrendAnalysisPanel from "@/components/dashboard/TrendAnalysisPanel";
import GrowthPotentialPanel from "@/components/dashboard/GrowthPotentialPanel";
import type { SellerKPI } from "@/hooks/useSellerData";
import type { ListingQuality } from "@/hooks/useListingsQuality";
import type { EligibilityItem } from "@/hooks/useEligibility";

/** Ponte causa→efeito entre blocos — metodologia de diagnóstico para o consultor. */
function PonteDiagnostico({ de, para, porque }: { de: string; para: string; porque: string }) {
  return (
    <div className="painel-ponte" role="note">
      <p className="painel-ponte-fluxo">
        <span>{de}</span>
        <span className="painel-ponte-seta" aria-hidden>
          →
        </span>
        <span>{para}</span>
      </p>
      <p className="painel-ponte-porque">{porque}</p>
    </div>
  );
}

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
        {porque && <p className="painel-bloco-porque">{porque}</p>}
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
}: Props) {
  return (
    <div className="painel-apple space-y-5">
      <header className="painel-apple-hero">
        <p className="ds-rotulo">Visão geral</p>
        <h1 className="painel-apple-titulo">Resultado, causas e tendências</h1>
        <p className="painel-apple-sub">
          Metodologia em cadeia: o que vendeu → tráfego → ritmo → conversão → reputação e logística → sazonalidade.
          {periodo ? ` Período ${periodo}.` : ""}
        </p>
      </header>

      {/* 1 · Resultado + 2 · Tráfego (efeito e causa imediata) — uma única fonte de TGMV/Ads/ROAS */}
      <ResumoExecutivo diario={diario as any} de={de} ate={ate} />

      <PonteDiagnostico
        de="Resultado e tráfego"
        para="Ritmo diário"
        porque="O total do período é o efeito. O gráfico diário mostra se veio de tendência sustentada ou de pico — isto por causa daquilo."
      />

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

      <PonteDiagnostico
        de="Visitas e Ads"
        para="Clips"
        porque="Parte do tráfego pode ser vídeo. Alta participação de Clips com CVR fraca aponta conteúdo — não só preço ou Ads."
      />

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

      <PonteDiagnostico
        de="Visitas"
        para="Funil"
        porque="A conversão oficial é visitas → pedidos. Etapas estimadas no meio ajudam a hipotetizar abandono, sem inventar métrica."
      />

      <Bloco n={5} titulo="Funil de conversão" periodo={periodo} porque="Onde a loja perde compradores — diagnóstico operacional.">
        <FunilVendas kpis={diario as any} periodo={periodo} indice={5} ocultarTitulo />
      </Bloco>

      <PonteDiagnostico
        de="Conversão"
        para="Reputação e envios"
        porque="Atrasos, cancelamentos e mix Full/Flex explicam parte da conversão fraca e risco de rebaixamento — causa operacional."
      />

      <Bloco
        n={6}
        titulo="Reputação, envios e logística"
        porque="Principais KPIs operacionais: termômetro, reclamações, atrasos, cancelamentos e participação Full/Flex/Agência."
      >
        <OperacaoResumo diario={diario as any} />
      </Bloco>

      <PonteDiagnostico
        de="Período atual"
        para="Sazonalidade"
        porque="Comparar com o mesmo mês em anos anteriores separa tendência estrutural de efeito de calendário."
      />

      <Bloco n={7} titulo="GMV mês vs mês" porque="Comparação anual do faturamento — contexto de sazonalidade.">
        <div className="painel-vidro rounded-2xl p-2">
          <GmvMesVsMes pontos={serieGmv} titulo="GMV mês vs mês (comparação anual)" />
        </div>
      </Bloco>

      <PonteDiagnostico
        de="Ads × GMV"
        para="Eficiência de escala"
        porque="Se o investimento sobe mais que o GMV, a causa é ineficiência de mídia — não falta de demanda."
      />

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
