import { useMemo } from "react";
import { motion } from "framer-motion";
import { Store, Info, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePockData } from "@/hooks/usePockData";
import PockGauge, { LegendaFaixas } from "./PockGauge";
import PockRateBar from "./PockRateBar";
import PockEvolucaoCard from "./PockEvolucaoCard";

interface Props {
  sellerId?: string;
  nickname?: string;
  custId?: string;
  segmento?: string;
  programas?: string;
}

const MEDALHAS: Record<string, { rotulo: string; cor: string }> = {
  green_platinum: { rotulo: "Platinum", cor: "hsl(var(--brand-blue))" },
  green_gold: { rotulo: "Gold", cor: "hsl(var(--warn))" },
  green_silver: { rotulo: "Silver", cor: "hsl(var(--muted-foreground))" },
  light_green: { rotulo: "Verde claro", cor: "hsl(var(--ok))" },
  green: { rotulo: "Verde", cor: "hsl(var(--ok))" },
  yellow: { rotulo: "Amarelo", cor: "hsl(var(--warn))" },
  orange: { rotulo: "Laranja", cor: "hsl(var(--warn-soft))" },
  red: { rotulo: "Vermelho", cor: "hsl(var(--crit))" },
  newbie: { rotulo: "Novo vendedor", cor: "hsl(var(--muted-foreground))" },
};

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-border/40 last:border-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{rotulo}</span>
      <span className="text-[11px] font-medium tnum text-right truncate">{valor || "—"}</span>
    </div>
  );
}

function Heroi({ titulo, legenda, valor }: { titulo: string; legenda: string; valor: number | null }) {
  return (
    <div className="rounded-lg border border-border p-3 flex flex-col items-center justify-center text-center h-full">
      <p className="text-[11px] font-semibold">{titulo}</p>
      <p className="text-3xl font-bold tnum my-2">
        {valor === null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug">{legenda}</p>
      {valor === null && (
        <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <HelpCircle className="w-3 h-3" /> Sem fonte disponível
        </span>
      )}
    </div>
  );
}

export default function PockPanel({ sellerId, nickname, custId, segmento, programas }: Props) {
  const { data, isLoading } = usePockData(sellerId);

  const series = data?.series ?? [];

  const pontos = useMemo(() => {
    const p = (fn: (m: (typeof series)[number]) => number | null) =>
      series.map((m) => ({ mes: m.mes, valor: fn(m) }));
    return {
      tgmv: p((m) => m.tgmv),
      ll: p((m) => m.ll),
      conversao: p((m) => (m.tsi !== null && m.visitas ? (m.tsi / m.visitas) * 100 : null)),
      visitas: p((m) => m.visitas),
      flex: p((m) => m.tgmvFlex),
      fbm: p((m) => (m.tgmvFbm !== null && m.tgmv ? (m.tgmvFbm / m.tgmv) * 100 : null)),
      pads: p((m) => m.invPads),
      cdp: p((m) => (m.cdpTgmv !== null && m.tgmv ? (m.cdpTgmv / m.tgmv) * 100 : null)),
      clipsLl: p((m) => (m.temClips === null ? null : m.temClips ? 100 : 0)),
      clips: p((m) => m.tgmvClips),
    };
  }, [series]);

  if (!sellerId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
        <Store className="w-7 h-7 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">Selecione uma loja para ver o diagnóstico POCK</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Use o seletor de loja no cabeçalho. Os medidores e a medalha são por vendedor — a visão
          consolidada da carteira não é somável aqui.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const s = data?.snapshot;
  const medalha = s?.repLevel ? MEDALHAS[s.repLevel] : undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* FAIXA 1 — Identidade e diagnóstico */}
      <section className="rounded-xl border border-border bg-card/40 p-4 space-y-4">
        <h3 className="text-sm font-semibold">Identidade e diagnóstico</h3>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 rounded-lg border border-border p-3">
            <p className="text-[11px] font-semibold mb-2">Detalhes do Vendedor</p>
            <Linha rotulo="Seller" valor={nickname} />
            <Linha rotulo="Segmento" valor={segmento} />
            <Linha rotulo="Integrador" valor={null} />
            <Linha rotulo="Minha Página" valor={null} />
            <Linha rotulo="Programas" valor={programas} />
            <Linha rotulo="Seller ID" valor={custId ? String(custId) : null} />
          </div>

          <div className="lg:col-span-2">
            <Heroi
              titulo="Taxa de Venda"
              legenda="Crescimento do vendedor em comparação ao seu mercado de atuação."
              valor={null}
            />
          </div>
          <div className="lg:col-span-2">
            <Heroi
              titulo="Favorabilidade"
              legenda="Qualidade de preço dos produtos do vendedor."
              valor={null}
            />
          </div>

          <div className="lg:col-span-5 rounded-lg border border-border p-3 space-y-3">
            <p className="text-[11px] font-semibold">Serviços · escala fixa 0–100</p>
            <div className="grid grid-cols-3 gap-3">
              <PockGauge valor={s?.scoreBbf ?? null} rotulo="Qualidade de Publicações" fonte="SCORE_FINAL_BBF" />
              <PockGauge valor={s?.usoCentralPromocoes ?? null} rotulo="Uso de Central de Promoções" fonte="derivado CDP" />
              <PockGauge valor={s?.scoreFull ?? null} rotulo="Uso de Fulfillment" fonte="SCORE_FINAL_FULL" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <PockGauge valor={s?.scorePads ?? null} rotulo="Grau de Investimento em PADS" fonte="SCORE_FINAL_PADS" />
              <PockGauge valor={s?.scoreIntegradores ?? null} rotulo="Utilização de Integradores" fonte="SCORE_FINAL_INTEGRADORES" />
              <div />
            </div>
            <LegendaFaixas />
          </div>

          <div className="lg:col-span-4 lg:col-start-4 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold">Recomendação</p>
              <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                Sem dado
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              GRUPO_ACAO não disponível na camada agregada — nenhum texto é gerado sem a fonte.
            </p>
          </div>
        </div>
      </section>

      {/* FAIXA 2 — Qualidade de Atendimento */}
      <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Qualidade de Atendimento</h3>
          <span
            className="text-[10px] rounded-full border px-2 py-0.5"
            style={{
              borderColor: medalha ? `${medalha.cor}` : "hsl(var(--border))",
              color: medalha ? medalha.cor : undefined,
            }}
          >
            {medalha ? `Medalha: ${medalha.rotulo}` : "Sem dado"}
          </span>
          <UiTooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[260px]">
              Taxas armazenadas em fração (0–1) e convertidas apenas na exibição: 0,125 = 12,5%.
            </TooltipContent>
          </UiTooltip>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <PockRateBar rotulo="Reclamação" valor={s?.repClaimsRate ?? null} limite={0.02} fonte="REP_CLAIMS_RATE" />
          <PockRateBar rotulo="Taxa de Atraso" valor={s?.repDelayedRate ?? null} limite={0.15} fonte="REP_DELAYED_HT_RATE" />
          <PockRateBar rotulo="Taxa Cancelamentos" valor={s?.repCancellationsRate ?? null} limite={0.03} fonte="REP_SELLER_CANCELLATIONS_RATE" />
          <PockRateBar rotulo="Disputas" valor={s?.repDisputesRate ?? null} limite={0.01} fonte="REP_DISPUTES_RATE" />
        </div>
      </section>

      {/* FAIXA 3 — Evolução ao longo do ano */}
      <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Evolução ao longo do ano</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PockEvolucaoCard titulo="Evolução TGMV" pontos={pontos.tgmv} formato="moeda" cobertura={data?.cobertura.tgmv} />
          <PockEvolucaoCard titulo="Evolução LL" pontos={pontos.ll} cobertura={data?.cobertura.ll} />
          <PockEvolucaoCard
            titulo="Evolução Taxa de Conversão"
            pontos={pontos.conversao}
            formato="percent"
            cobertura={data?.cobertura.tsi}
            derivadoFormula="Conversão = TSI / VISITAS × 100"
          />
          <PockEvolucaoCard titulo="Evolução Visitas" pontos={pontos.visitas} cobertura={data?.cobertura.visitas} />
          <PockEvolucaoCard titulo="Evolução Flex" pontos={pontos.flex} formato="moeda" cobertura={data?.cobertura.tgmvFlex} />
          <PockEvolucaoCard
            titulo="Penetração de FBM"
            pontos={pontos.fbm}
            formato="percent"
            cobertura={data?.cobertura.tgmvFbm}
            derivadoFormula="Penetração FBM = TGMV_LC_FBM / TGMV_LC × 100"
          />
          <PockEvolucaoCard titulo="Penetração PADS (INV_PADS)" pontos={pontos.pads} formato="moeda" cobertura={data?.cobertura.invPads} />
          <PockEvolucaoCard
            titulo="Penetração CDP"
            pontos={pontos.cdp}
            formato="percent"
            cobertura={data?.cobertura.cdpTgmv}
            derivadoFormula="Penetração CDP = CDP_TGMV_LC / TGMV_LC × 100"
          />
          <PockEvolucaoCard
            titulo="Penetração de Clips x LL"
            pontos={pontos.clipsLl}
            formato="percent"
            cobertura={data?.cobertura.temClips}
            derivadoFormula="Flag SELLERS_CLIPS_PUBLI (booleana, nunca somada): 100% quando o mês tem publicação de clips."
          />
          <PockEvolucaoCard titulo="Evolução de Clips" pontos={pontos.clips} formato="moeda" cobertura={data?.cobertura.tgmvClips} />
        </div>
      </section>
    </motion.div>
  );
}