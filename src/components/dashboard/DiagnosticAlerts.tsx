import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, HelpCircle, Info, MinusCircle, OctagonAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { shareVisitasCaras } from "@/lib/percentGuards";
import QualityIndexDrawer from "@/components/dashboard/QualityIndexDrawer";
import { useQualityCarteira } from "@/hooks/useQualityCarteira";
import {
  decomporQualidade,
  percentilNaCarteira,
  reconciliarBbf,
  TEXTO_AJUDA_QUALITY,
  type ItemDecomposto,
} from "@/lib/qualityIndex";

type Severidade = "critico" | "atencao" | "info";
type Semaforo = "ok" | "atencao" | "critico" | "neutro" | "sem_dado";

interface KpiLike {
  date?: string;
  productName?: string;
  productId?: string;
  repLevel?: string;
  repDelayedRate?: number;
  repClaimsRate?: number;
  scoreQualidade?: number;
  scoreOferta?: number;
  scoreCaracteristica?: number;
  scoreFinalBbf?: number;
  llPicturesScore?: number;
  llTitleScore?: number;
  llTechSpecsScore?: number;
  llDescriptionScore?: number;
  llPriceScore?: number;
  llStockAvailabilityScore?: number;
  llFreeShippingScore?: number;
  llPromotionsScore?: number;
  pontuacaoLlGtin?: number;
  scorePhoto?: number;
  scoreTitle?: number;
  adsInvestment?: number;
  tgmv?: number;
  revenue?: number;
  visits?: number;
  visitsExpensive?: number;
  minPriceRival?: number;
}

interface DiagnosticAlertsProps {
  kpis: KpiLike[];
  /** Série mensal usada como fallback quando a série diária não traz o indicador (ex.: score de qualidade só existe no mensal). */
  fallbackKpis?: KpiLike[];
  sellerCustIdMap?: Record<string, string>;
  seller?: { nickname: string; custId?: string; cluster?: string; subCluster?: string; state?: string } | null;
}

/* ---------------- helpers determinísticos ---------------- */

const META_PRAZO = 95; // % de envios no prazo exigido pelo programa
const META_ADS = 3; // % de investimento sobre o TGMV

const NIVEIS_OK = ["green", "light_green", "green_gold", "green_platinum", "green_silver"];

function semaforoReputacao(nivel: string): { estado: Semaforo; rotulo: string } {
  const n = (nivel || "").trim().toLowerCase();
  if (!n) return { estado: "sem_dado", rotulo: "sem dado" };
  if (NIVEIS_OK.includes(n)) return { estado: "ok", rotulo: n.replace(/_/g, " ") };
  if (n === "yellow") return { estado: "atencao", rotulo: "amarelo" };
  if (n === "orange" || n === "red") return { estado: "critico", rotulo: n === "red" ? "vermelho" : "laranja" };
  if (n === "newbie") return { estado: "neutro", rotulo: "newbie" };
  return { estado: "neutro", rotulo: n.replace(/_/g, " ") };
}

const CORES: Record<Semaforo, string> = {
  ok: "text-ok",
  atencao: "text-warn",
  critico: "text-crit",
  neutro: "text-muted-foreground",
  sem_dado: "text-muted-foreground",
};

const ROTULO_SEMAFORO: Record<Semaforo, string> = {
  ok: "na meta",
  atencao: "atenção",
  critico: "crítico",
  neutro: "neutro",
  sem_dado: "sem dado",
};

function IconeSemaforo({ estado, className }: { estado: Semaforo; className?: string }) {
  const cls = cn("w-3.5 h-3.5 shrink-0", CORES[estado], className);
  if (estado === "ok") return <CheckCircle2 className={cls} />;
  if (estado === "atencao") return <AlertTriangle className={cls} />;
  if (estado === "critico") return <OctagonAlert className={cls} />;
  return <MinusCircle className={cls} />;
}

const fmtPct = (v: number, casas = 1) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

interface Indicador {
  rotulo: string;
  valor: string;
  meta: string;
  estado: Semaforo;
  chip?: string;
  derivado?: string;
  temDado: boolean;
  foraDaMeta: boolean;
  contexto?: string;
  ajuda?: string;
  onAbrir?: () => void;
}

interface Alerta {
  id: string;
  severidade: Severidade;
  descricao: string;
  acao: string;
  titulo: string;
  contexto: string;
  passos: string[];
}

const PESO: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

/* ---------------- componente ---------------- */

const DiagnosticAlerts = ({ kpis, fallbackKpis = [], sellerCustIdMap = {}, seller = null }: DiagnosticAlertsProps) => {
  const [drawer, setDrawer] = useState(false);
  const [detalhe, setDetalhe] = useState<Alerta | null>(null);
  const [qualidadeDrawer, setQualidadeDrawer] = useState(false);
  const { data: carteira } = useQualityCarteira();

  const { nome, custId, chips, indicadores, alertas, resumo, qualidade: qualidadeInfo } = useMemo(() => {
    const ordenados = [...(kpis || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const ultimaData = ordenados[0]?.date;
    const linhas = ordenados.filter((k) => k.date === ultimaData);

    const soma = (fn: (k: KpiLike) => number) => linhas.reduce((s, k) => s + (fn(k) || 0), 0);
    const mediaPonderada = (fn: (k: KpiLike) => number | undefined) => {
      const validos = linhas.filter((k) => Number(fn(k)) > 0);
      if (validos.length === 0) return null;
      return validos.reduce((s, k) => s + Number(fn(k)), 0) / validos.length;
    };

    const nomeLoja = seller?.nickname || (linhas.length === 1 ? linhas[0]?.productName : "") || "Carteira consolidada";
    const cust = seller?.custId || (linhas.length === 1 ? sellerCustIdMap[linhas[0]?.productId || ""] : undefined);

    // Linha 1 — chips neutros. Valor nulo não é renderizado.
    const chipsId: { rotulo: string; valor: string }[] = [];
    if (seller?.cluster) chipsId.push({ rotulo: "Classificação", valor: seller.cluster });
    if (seller?.subCluster && seller.subCluster !== seller.cluster)
      chipsId.push({ rotulo: "Perfil", valor: seller.subCluster });
    if (seller?.state) chipsId.push({ rotulo: "UF", valor: seller.state });

    // Linha 2 — indicadores
    const nivelRep = linhas.find((k) => (k.repLevel || "").trim())?.repLevel || "";
    const rep = semaforoReputacao(nivelRep);

    const atraso = mediaPonderada((k) => k.repDelayedRate); // escala 0–1
    const noPrazo = atraso != null ? (1 - atraso) * 100 : null;

    // Quality Index (SCORE_FINAL_BBF): média dos três blocos. A base diária vem zerada
    // nesses scores, então caímos no último período mensal com dado.
    const mediaEm = (linhasBase: KpiLike[], fn: (k: KpiLike) => number | undefined) => {
      const validos = linhasBase.filter((k) => Number(fn(k)) > 0);
      if (validos.length === 0) return null;
      return validos.reduce((s, k) => s + Number(fn(k)), 0) / validos.length;
    };
    const CAMPOS_QUALIDADE = [
      "scoreCaracteristica", "scoreOferta", "scoreQualidade", "scoreFinalBbf",
      "llPicturesScore", "llTitleScore", "llTechSpecsScore", "llDescriptionScore",
      "llPriceScore", "llStockAvailabilityScore", "llFreeShippingScore", "llPromotionsScore",
      "pontuacaoLlGtin",
    ] as const;
    const temScore = (k: KpiLike) =>
      (Number(k.scoreCaracteristica) || 0) > 0 ||
      (Number(k.scoreOferta) || 0) > 0 ||
      (Number(k.scoreQualidade) || 0) > 0;
    const agregar = (base: KpiLike[]): Record<string, number | null> => {
      const out: Record<string, number | null> = {};
      for (const campo of CAMPOS_QUALIDADE) {
        out[campo] = mediaEm(base, (k) => (k as any)[campo]);
      }
      return out;
    };

    let baseQualidade = linhas.filter(temScore);
    let qualidadeFallback = false;
    if (baseQualidade.length === 0 && fallbackKpis.length > 0) {
      const datasFallback = [...new Set(
        fallbackKpis.filter(temScore).map((k) => String(k.date || "")).filter(Boolean),
      )].sort((a, b) => b.localeCompare(a));
      const ultimaDataComScore = datasFallback[0];
      if (ultimaDataComScore) {
        baseQualidade = fallbackKpis.filter((k) => k.date === ultimaDataComScore && temScore(k));
        qualidadeFallback = baseQualidade.length > 0;
      }
    }
    const linhaQualidade = baseQualidade.length ? agregar(baseQualidade) : null;
    const bbf = reconciliarBbf(linhaQualidade);
    const qualidade = bbf.valor; // SCORE_FINAL_BBF — sem clamp
    const itensQualidade: ItemDecomposto[] = decomporQualidade(linhaQualidade);

    const tgmvTotal = soma((k) => Number(k.tgmv) || Number(k.revenue) || 0);
    const adsTotal = soma((k) => Number(k.adsInvestment) || 0);
    const shareAds = tgmvTotal > 0 && adsTotal > 0 ? (adsTotal / tgmvTotal) * 100 : null;

    const inds: Indicador[] = [
      {
        rotulo: "Reputação",
        valor: rep.estado === "sem_dado" ? "—" : rep.rotulo,
        meta: "meta: verde",
        estado: rep.estado,
        chip: rep.estado === "sem_dado" ? undefined : rep.rotulo,
        temDado: rep.estado !== "sem_dado",
        foraDaMeta: rep.estado === "atencao" || rep.estado === "critico",
      },
      {
        rotulo: "Envios no prazo",
        valor: noPrazo != null ? fmtPct(noPrazo) : "—",
        meta: `meta: ≥ ${META_PRAZO}%`,
        estado:
          noPrazo == null ? "sem_dado" : noPrazo >= META_PRAZO ? "ok" : noPrazo >= META_PRAZO - 3 ? "atencao" : "critico",
        derivado: "1 − REP_DELAYED_HT_RATE. O campo vem na escala 0–1: 0,0285 equivale a 97,2% no prazo.",
        temDado: noPrazo != null,
        foraDaMeta: noPrazo != null && noPrazo < META_PRAZO,
      },
      {
        rotulo: "Qualidade do anúncio",
        valor: qualidade != null ? qualidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—",
        meta: "meta: 80–100",
        estado: qualidade == null ? "sem_dado" : qualidade >= 80 ? "ok" : qualidade >= 60 ? "atencao" : "critico",
        derivado: qualidadeFallback
          ? "SCORE_FINAL_BBF do último mês fechado — a base diária não traz esses scores."
          : "SCORE_FINAL_BBF do período exibido.",
        contexto: contextoQualidade,
        ajuda: `${TEXTO_AJUDA_QUALITY} Referência: mediana da carteira ${
          medianaCarteira != null ? medianaCarteira.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "33"
        } · melhor da carteira ${
          melhorCarteira != null ? melhorCarteira.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "87"
        } · meta do programa 80–100.`,
        temDado: qualidade != null,
        foraDaMeta: qualidade != null && qualidade < 80,
      },
      {
        rotulo: "Investimento em Ads",
        valor: shareAds != null ? fmtPct(shareAds) : "—",
        meta: `meta: ${META_ADS}%`,
        estado:
          shareAds == null ? "sem_dado" : shareAds <= META_ADS ? "ok" : shareAds <= META_ADS * 2 ? "atencao" : "critico",
        derivado: "INV_PADS ÷ TGMV_LC no período exibido.",
        temDado: shareAds != null,
        foraDaMeta: shareAds != null && shareAds > META_ADS,
      },
    ];

    // Linha 3 — alertas determinísticos
    const lista: Alerta[] = [];
    if (inds[0].estado === "critico")
      lista.push({
        id: "rep", severidade: "critico", descricao: "Reputação fora da faixa verde.", acao: "Ver detalhe",
        titulo: "Reputação fora da faixa verde",
        contexto: `Nível atual: ${inds[0].valor}. Meta: verde. Fonte: REP_LEVEL do último período com dado.`,
        passos: [
          "Reduzir atrasos de envio e cancelamentos por falta de estoque.",
          "Responder e resolver reclamações abertas dentro do prazo.",
          "Revisar anúncios com maior volume de mediações.",
        ],
      });
    else if (inds[0].estado === "atencao")
      lista.push({
        id: "rep", severidade: "atencao", descricao: "Reputação em amarelo — risco de rebaixamento.", acao: "Ver detalhe",
        titulo: "Reputação em amarelo",
        contexto: `Nível atual: ${inds[0].valor}. Meta: verde. Amarelo indica risco de rebaixamento no próximo ciclo.`,
        passos: [
          "Monitorar diariamente reclamações e atrasos.",
          "Priorizar SKUs com maior giro para evitar rupturas.",
        ],
      });

    if (inds[1].foraDaMeta)
      lista.push({
        id: "prazo",
        severidade: inds[1].estado === "critico" ? "critico" : "atencao",
        descricao: `Envios no prazo em ${inds[1].valor}, abaixo da meta de ${META_PRAZO}%.`,
        acao: "Ver detalhe",
        titulo: "Envios no prazo abaixo da meta",
        contexto: `Atual: ${inds[1].valor} · Meta: ≥ ${META_PRAZO}%. Cálculo: 1 − REP_DELAYED_HT_RATE (campo na escala 0–1).`,
        passos: [
          "Verificar handling time cadastrado versus o real.",
          "Avaliar migração dos SKUs de maior giro para Full.",
          "Ajustar cut-off de coleta e calendário de feriados.",
        ],
      });

    const fotos = mediaPonderada((k) => k.scorePhoto);
    if (fotos != null && fotos < 70)
      lista.push({
        id: "fotos", severidade: "critico", descricao: "Score de fotos abaixo de 70.", acao: "Melhorar Fotos",
        titulo: "Score de fotos abaixo de 70",
        contexto: `Média do período: ${fotos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} (faixa saudável ≥ 70).`,
        passos: [
          "Fundo branco, produto centralizado e mínimo de 1200px.",
          "Ao menos 4 imagens por anúncio, incluindo detalhes e escala.",
          "Remover textos e selos promocionais das imagens principais.",
        ],
      });

    const titulos = mediaPonderada((k) => k.scoreTitle);
    if (titulos != null && titulos < 70)
      lista.push({
        id: "titulo", severidade: "atencao", descricao: "Score de título abaixo de 70.", acao: "Ajustar SEO",
        titulo: "Score de título abaixo de 70",
        contexto: `Média do período: ${titulos.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} (faixa saudável ≥ 70).`,
        passos: [
          "Estrutura: produto + marca + modelo + atributo principal.",
          "Evitar repetição de palavras e caracteres promocionais.",
          "Completar ficha técnica — atributos alimentam a busca.",
        ],
      });

    if (inds[3].foraDaMeta)
      lista.push({
        id: "ads",
        severidade: inds[3].estado === "critico" ? "critico" : "atencao",
        descricao: `Investimento em Ads em ${inds[3].valor} do faturamento (meta ${META_ADS}%).`,
        acao: "Ver detalhe",
        titulo: "Investimento em Ads acima da meta",
        contexto: `Atual: ${inds[3].valor} do faturamento · Meta: ${META_ADS}%. Cálculo: INV_PADS ÷ TGMV_LC no período exibido.`,
        passos: [
          "Revisar campanhas com ROAS abaixo de 2,0x.",
          "Concentrar orçamento nos SKUs com maior conversão orgânica.",
          "Checar se a alta de TACOS não vem de queda de faturamento.",
        ],
      });

    // visits_expensive pode vir maior que visits em alguns dias (contagem por anúncio):
    // o helper limita linha a linha e trava o share em 0–100%.
    const shareCaras = shareVisitasCaras(linhas);
    if (shareCaras != null && shareCaras > 0.3)
      lista.push({
        id: "preco", severidade: "atencao", descricao: "Preço não competitivo em parte relevante das visitas.", acao: "Revisar Preço",
        titulo: "Preço não competitivo",
        contexto: `${(shareCaras * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% das visitas caem em anúncios com preço acima do concorrente (limite de referência: 30%).`,
        passos: [
          "Comparar com o menor preço rival nos SKUs de maior visita.",
          "Avaliar cupons ou campanhas cofinanciadas antes de baixar preço-base.",
          "Checar frete grátis, que entra na percepção de preço final.",
        ],
      });

    if (inds[2].foraDaMeta)
      lista.push({
        id: "qualidade", severidade: "info", descricao: "Qualidade do anúncio abaixo da faixa 80–100.", acao: "Ver detalhe",
        titulo: "Qualidade do anúncio abaixo da faixa ideal",
        contexto: `Atual: ${inds[2].valor} · Faixa ideal: 80–100. Combina ficha técnica, fotos, título e conversão.`,
        passos: [
          "Completar atributos obrigatórios e EAN.",
          "Revisar descrição e ficha técnica dos anúncios de maior visita.",
          "Acompanhar o painel de Qualidade para os itens com score < 70.",
        ],
      });

    lista.sort((a, b) => PESO[a.severidade] - PESO[b.severidade]);

    // Frase de resumo — 100% determinística
    const comDado = inds.filter((i) => i.temDado).length;
    const cobertura = Math.round((comDado / inds.length) * 100);
    const fora = inds.filter((i) => i.foraDaMeta).length;
    const pior = lista[0];
    const nivelTexto = inds[0].temDado ? inds[0].valor : "sem dado";
    let frase = `${nomeLoja} está em reputação ${nivelTexto}, com ${fora} de ${inds.length} indicadores fora da meta.`;
    if (pior) frase += ` ${pior.severidade === "critico" ? "Crítico" : "Atenção"}: ${pior.descricao}`;
    if (cobertura < 70) frase = `Leitura parcial (${cobertura}% de cobertura) — ${frase}`;

    return { nome: nomeLoja, custId: cust, chips: chipsId, indicadores: inds, alertas: lista, resumo: frase };
  }, [kpis, sellerCustIdMap, seller]);

  const criticos = alertas.filter((a) => a.severidade === "critico").length;
  const visiveis = alertas.slice(0, 5);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="glass-card rounded-none p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Diagnóstico</h3>
          {alertas.length > 0 && (
            <span
              className={cn(
                "status-badge text-[11px]",
                criticos > 0 ? "bg-crit/10 text-crit border-crit/25" : "bg-warn/10 text-warn border-warn/25",
              )}
            >
              {alertas.length === 1 ? "1 alerta" : `${alertas.length} alertas`}
            </span>
          )}
        </div>

        <p className="text-[13px] text-muted-alt leading-snug">{resumo}</p>

        {/* LINHA 1 — identidade */}
        <div className="flex flex-wrap items-center gap-2">
          {custId ? (
            <a
              href={`https://lista.mercadolivre.com.br/_CustId_${custId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-bold text-foreground hover:text-brand-blue transition-colors"
            >
              {nome}
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          ) : (
            <span className="text-base font-bold">{nome}</span>
          )}
          {chips.map((c) => (
            <span
              key={c.rotulo}
              className="inline-flex items-center gap-1 rounded-full bg-muted/10 border border-border px-2 py-0.5 text-[11px] text-muted-alt"
            >
              <span className="opacity-70">{c.rotulo}</span>
              <span className="font-medium text-foreground/90">{c.valor}</span>
            </span>
          ))}
        </div>

        {/* LINHA 2 — indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {indicadores.map((i) => (
            <div key={i.rotulo} className="rounded-lg border border-border bg-muted/10 px-3 py-2 flex flex-col justify-between min-h-[86px]">
              <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-alt">
                <span>{i.rotulo}</span>
                {i.derivado && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 rounded bg-brand-blue/10 text-brand-blue px-1 py-px text-[9px] normal-case cursor-help">
                        <Info className="w-2.5 h-2.5" /> derivado
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px] text-xs">{i.derivado}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={cn(
                    "text-[22px] font-bold font-mono tabular-nums leading-none capitalize",
                    !i.temDado && "text-muted-foreground",
                  )}
                >
                  {i.valor}
                </span>
                <span className="text-[11px] text-muted-alt">{i.meta}</span>
              </div>
              <div className={cn("flex items-center gap-1 text-[11px] mt-1.5", CORES[i.estado])}>
                <IconeSemaforo estado={i.estado} />
                <span>{ROTULO_SEMAFORO[i.estado]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* LINHA 3 — alertas */}
        <div className="space-y-1">
          {alertas.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-ok rounded-lg border border-ok/25 bg-ok/5 px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Nenhum alerta ativo neste período.</span>
            </div>
          ) : (
            visiveis.map((a) => <LinhaAlerta key={a.id} alerta={a} onAbrir={setDetalhe} />)
          )}
          {alertas.length > 5 && (
            <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={() => setDrawer(true)}>
              ver todos ({alertas.length})
            </Button>
          )}
        </div>

        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Alertas — {nome}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {alertas.map((a) => (
                <LinhaAlerta key={a.id} alerta={a} onAbrir={setDetalhe} />
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {detalhe && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <IconeSemaforo estado={detalhe.severidade === "critico" ? "critico" : detalhe.severidade === "atencao" ? "atencao" : "neutro"} />
                    {detalhe.titulo}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-border bg-muted/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-alt mb-1">Situação</p>
                    <p className="text-[13px] leading-snug">{detalhe.contexto}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-alt mb-1.5">O que fazer</p>
                    <ul className="space-y-1.5">
                      {detalhe.passos.map((p) => (
                        <li key={p} className="text-[13px] leading-snug flex gap-2">
                          <span className="text-brand-blue">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Loja: {nome}{custId ? ` · Cust ID ${custId}` : ""}
                  </p>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
};

function LinhaAlerta({ alerta, onAbrir }: { alerta: Alerta; onAbrir: (a: Alerta) => void }) {
  const estado: Semaforo = alerta.severidade === "critico" ? "critico" : alerta.severidade === "atencao" ? "atencao" : "neutro";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors px-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <IconeSemaforo estado={estado} />
        <span className="text-[12px] truncate">{alerta.descricao}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[11px] text-brand-blue shrink-0"
        onClick={() => onAbrir(alerta)}
      >
        {alerta.acao}
      </Button>
    </div>
  );
}

export default DiagnosticAlerts;