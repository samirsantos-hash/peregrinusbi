import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Sparkles as IconeIA, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Store, Info, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePockData } from "@/hooks/usePockData";
import { NovidadeTip } from "@/components/novidades/novidades";
import PockGauge, { LegendaFaixas } from "./PockGauge";
import NumeroAnimado from "@/components/ds/NumeroAnimado";
import PockRateBar from "./PockRateBar";
import PockEvolucaoCard from "./PockEvolucaoCard";
import PockMecanismosDesconto from "./PockMecanismosDesconto";
import PockAdesaoFull from "./PockAdesaoFull";

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
      <span className="text-[10px] uppercase tracking-wide text-foreground/70">{rotulo}</span>
      <span className="text-xs font-medium tnum text-right truncate text-foreground">{valor || "—"}</span>
    </div>
  );
}

function Heroi({ titulo, legenda, valor, detalhe, sinal }: { titulo: string; legenda: string; valor: number | null; detalhe?: string; sinal?: boolean }) {
  const cor = valor === null ? "text-foreground" : sinal ? (valor >= 0 ? "text-ok" : "text-destructive") : valor >= 75 ? "text-ok" : valor >= 50 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-lg border border-border bg-background/70 backdrop-blur-md p-3 flex flex-col items-center justify-center text-center h-full">
      <p className="text-xs font-semibold text-foreground">{titulo}</p>
      <p className={`text-3xl font-semibold tnum my-2 ${cor}`}>
        {valor === null ? "—" : <NumeroAnimado valor={`${sinal && valor > 0 ? "+" : ""}${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${sinal ? " p.p." : "%"}`} />}
      </p>
      <p className="text-[11px] text-foreground/75 leading-snug">{legenda}</p>
      {detalhe && <p className="mt-1 text-[10px] text-foreground/60 leading-snug">{detalhe}</p>}
      {valor === null && (
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-foreground/60">
          <HelpCircle className="w-3 h-3" /> Dados insuficientes no período
        </span>
      )}
    </div>
  );
}

type Rec = { resumo: string; recomendacoes: { criterio: string; prioridade: string; titulo: string; texto: string }[] };

function RecomendacaoIA({ loja, metricas }: { loja: string; metricas: Record<string, unknown> | undefined }) {
  const [rec, setRec] = useState<Rec | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const gerar = async () => {
    setCarregando(true); setErro(null);
    const { data, error } = await supabase.functions.invoke("recomendar-seller", { body: { loja, metricas } });
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json())?.error ?? msg; } catch { /* */ } }
      setErro(msg);
    } else setRec(data as Rec);
    setCarregando(false);
  };
  const corP: Record<string, string> = { alta: "border-destructive/60 text-destructive", media: "border-warning/60 text-warning", baixa: "border-ok/60 text-ok" };
  return (
    <div className="md:col-span-12 rounded-lg border border-border bg-background/70 backdrop-blur-md p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5"><IconeIA className="w-3.5 h-3.5 text-primary" /> Recomendação com IA</p>
        <Button size="sm" variant="outline" onClick={gerar} disabled={carregando || !metricas}>
          {carregando ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Analisando…</> : rec ? "Gerar de novo" : "Gerar recomendação"}
        </Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {!rec && !erro && !carregando && (
        <p className="text-xs text-foreground/70">A IA lê preço, reputação, publicidade, logística, promoções e crescimento desta loja e sugere onde melhorar.</p>
      )}
      {rec && (
        <>
          <p className="text-sm text-foreground leading-relaxed">{rec.resumo}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rec.recomendacoes.map((r, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-0.5 ${corP[r.prioridade] ?? ""}`}>{r.prioridade}</span>
                  <span className="text-[10px] uppercase tracking-wide text-foreground/60">{r.criterio}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{r.titulo}</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{r.texto}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-foreground/50">Texto gerado por IA a partir dos números da loja. Confira antes de repassar ao vendedor.</p>
        </>
      )}
    </div>
  );
}

const fmtPct = (v: number | null) => v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

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
      fbm: p((m) => (m.tgmvFbm !== null && m.tgmv ? Math.min(100, (m.tgmvFbm / m.tgmv) * 100) : null)),
      pads: p((m) => m.invPads),
      cdp: p((m) => (m.cdpTgmv !== null && m.tgmv ? Math.min(100, (m.cdpTgmv / m.tgmv) * 100) : null)),
      clips: p((m) => m.tgmvClips),
    };
  }, [series]);

  if (!sellerId) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
        <Store className="w-7 h-7 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">Selecione uma loja para ver o diagnóstico Pock</p>
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
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Identidade e diagnóstico
          <NovidadeTip id="pock" />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 lg:gap-4">
          <div className="md:col-span-6 lg:col-span-3 rounded-lg border border-border bg-background/70 backdrop-blur-md p-3">
            <p className="text-[11px] font-semibold mb-2">Detalhes do Vendedor</p>
            <Linha rotulo="Seller" valor={nickname} />
            <Linha rotulo="Segmento" valor={segmento} />
            <Linha rotulo="Integrador" valor={null} />
            <Linha rotulo="Minha Página" valor="Ativa" />
            <Linha rotulo="Programas" valor={programas} />
            <Linha rotulo="Seller ID" valor={custId ? String(custId) : null} />
          </div>

          <div className="md:col-span-3 lg:col-span-2">
            <Heroi
              titulo="Taxa de Venda"
              legenda="Crescimento do vendedor em comparação ao seu mercado de atuação."
              valor={s?.taxaVenda.valor ?? null}
              sinal
              detalhe={s?.taxaVenda.valor != null ? `Loja ${fmtPct(s.taxaVenda.seller)} vs mercado ${fmtPct(s.taxaVenda.mercado)} · ${s.taxaVenda.mesRef?.split("-").reverse().join("/")} contra mês anterior` : undefined}
            />
          </div>
          <div className="md:col-span-3 lg:col-span-2">
            <Heroi
              titulo="Favorabilidade"
              legenda="Quanto a loja cumpre as metas de preço, reputação, publicidade, Full e promoções."
              valor={s?.favorabilidade.valor ?? null}
            />
          </div>

          <div className="md:col-span-12 lg:col-span-5 rounded-lg border border-border bg-background/70 backdrop-blur-md p-3 space-y-3">
            <p className="text-xs font-semibold text-foreground">Serviços · escala fixa 0–100</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 items-start [&>p]:rounded-md [&>p]:border [&>p]:border-border/40 [&>p]:px-3 [&>p]:py-2">
              <PockGauge valor={s?.scoreBbf ?? null} rotulo="Qualidade de Publicações" fonte="SCORE_FINAL_BBF" />
              <PockGauge valor={s?.usoCentralPromocoes ?? null} rotulo="Uso de Central de Promoções" fonte="derivado CDP" />
              <PockGauge valor={s?.scoreFull ?? null} rotulo="Uso de Fulfillment" fonte="SCORE_FINAL_FULL" />
              <PockGauge valor={s?.scorePads ?? null} rotulo="Grau de Investimento em PADS" fonte="SCORE_FINAL_PADS" />
              <PockGauge valor={s?.scoreIntegradores ?? null} rotulo="Utilização de Integradores" fonte="SCORE_FINAL_INTEGRADORES" />
            </div>
            <LegendaFaixas />
          </div>

          <RecomendacaoIA loja={nickname ?? "Loja"} metricas={s?.metricas} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
          <PockEvolucaoCard
            titulo="Evolução TGMV"
            pontos={pontos.tgmv}
            formato="moeda"
            cobertura={data?.cobertura.tgmv}
            unidade="R$ (faturamento bruto do mês)"
            oQueMostra="Quanto a loja faturou em cada mês, comparado com o mesmo mês do ano anterior."
            comoLer="Barra escura é o mês atual e a clara é o ano anterior; as linhas mostram a variação contra o ano anterior e contra o mês anterior. Serve para separar sazonalidade de crescimento real."
          />
          <PockEvolucaoCard
            titulo="Evolução LL"
            pontos={pontos.ll}
            cobertura={data?.cobertura.ll}
            unidade="quantidade de anúncios ativos"
            oQueMostra="O tamanho do sortimento exposto na plataforma em cada mês."
            comoLer="Queda junto com queda de visitas indica perda de exposição; crescimento sem visitas indica cadastro novo sem qualidade ou sem giro."
          />
          <PockEvolucaoCard
            titulo="Evolução Taxa de Conversão"
            pontos={pontos.conversao}
            formato="percent"
            cobertura={data?.cobertura.tsi}
            unidade="% (itens vendidos a cada 100 visitas)"
            derivado="Calculado comparando os itens vendidos com as visitas recebidas no mesmo mês."
            oQueMostra="Quantos itens a loja vende a cada 100 visitas recebidas."
            comoLer="Mede a eficiência da página (preço, ficha, reputação e frete). Se cair com visitas estáveis, o problema é a oferta, não o tráfego."
          />
          <PockEvolucaoCard
            titulo="Evolução Visitas"
            pontos={pontos.visitas}
            cobertura={data?.cobertura.visitas}
            unidade="quantidade de visitas"
            oQueMostra="Quantas visitas os anúncios da loja receberam no mês, somando tráfego orgânico e de anúncios."
            comoLer="É o topo do funil. Compare com faturamento e conversão para saber se falta tráfego ou se falta converter o tráfego que já chega."
          />
          <PockEvolucaoCard
            titulo="Evolução Flex"
            pontos={pontos.flex}
            formato="moeda"
            cobertura={data?.cobertura.tgmvFlex}
            unidade="R$ (faturamento em vendas com envio Flex)"
            oQueMostra="Quanto a loja faturou em vendas entregues pelo próprio vendedor no mesmo dia (Flex)."
            comoLer="Crescimento indica ganho de conversão pelo prazo curto; queda pode ser redução de raio de entrega ou migração das vendas para o Full."
          />
          <PockEvolucaoCard
            titulo="Penetração de FBM"
            pontos={pontos.fbm}
            formato="percent"
            cobertura={data?.cobertura.tgmvFbm}
            unidade="% do faturamento do mês"
            derivado="Calculado comparando o faturamento enviado por Fulfillment com o faturamento total do mês."
            oQueMostra="Que fatia do faturamento sai com estoque no centro de distribuição do Mercado Livre."
            comoLer="Penetração maior costuma trazer mais exposição e prazo melhor. O restante não é um modal único: inclui Flex, agência, coletas, Correios e outros, que não são separáveis nesta base."
          />
          <PockEvolucaoCard
            titulo="Investimento em Product Ads (R$)"
            pontos={pontos.pads}
            formato="moeda"
            cobertura={data?.cobertura.invPads}
            unidade="R$ (investimento em Product Ads no mês)"
            oQueMostra="Quanto a loja investiu em anúncios patrocinados (Product Ads) em cada mês."
            comoLer="Leia junto com o faturamento: investimento subindo sem faturamento proporcional indica perda de retorno da mídia."
          />
          <PockEvolucaoCard
            titulo="Penetração CDP"
            pontos={pontos.cdp}
            formato="percent"
            cobertura={data?.cobertura.cdpTgmv}
            unidade="% do faturamento do mês"
            derivado="Calculado comparando o faturamento vindo de campanhas da Central de Promoções com o faturamento total do mês."
            oQueMostra="Que fatia das vendas depende de campanhas promocionais."
            comoLer="Muito alta sugere margem pressionada pelas promoções; muito baixa indica oportunidade de aderir a mais campanhas. Meses em que toda a venda passou por campanha aparecem em 100%."
          />
          <PockEvolucaoCard
            titulo="GMV influenciado por Clips"
            pontos={pontos.clips}
            formato="moeda"
            cobertura={data?.cobertura.tgmvClips}
            unidade="R$ (faturamento influenciado por Clips)"
            oQueMostra="Quanto faturamento foi influenciado por vendas originadas nos vídeos curtos (Clips) em cada mês."
            comoLer="Exibido em reais porque a atribuição de Clips não é uma fatia do faturamento total: em alguns meses ela supera o próprio faturamento do mês, então qualquer percentual seria enganoso enquanto o denominador correto não for confirmado com a fonte."
          />
        </div>
      </section>

      {/* FAIXA 4 — Alavancas */}
      <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">Alavancas</h3>
          <span className="text-[10px] text-muted-foreground">Janela fixa de 30 dias — prazo limite de uma promoção</span>
        </div>
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
          <PockMecanismosDesconto
            mecanismos={data?.mecanismos ?? []}
            base={data?.mecanismosBase ?? 0}
            mesReferencia={data?.mecanismosMes ?? null}
          />
          <PockAdesaoFull dados={data?.full ?? []} coberturaFbm={data?.coberturaFbm} />
        </div>
      </section>
    </motion.div>
  );
}