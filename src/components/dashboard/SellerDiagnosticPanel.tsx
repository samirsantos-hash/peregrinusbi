import { motion } from "framer-motion";
import { Award, Layers, Tag, MapPin, Clock, ShieldCheck, Truck, Package, Zap, CheckCircle2, AlertTriangle, XCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import TooltipInfo from "./TooltipInfo";
import { useClassificacaoLojas, TIER_THRESHOLDS } from "@/hooks/useClassificacaoLojas";

interface Seller {
  id?: string;
  nickname?: string;
  cluster?: string;
  subCluster?: string;
  state?: string;
}

interface KpiLike {
  date?: string;
  shareFullPct?: number;
  shareFlexPct?: number;
  nivelReputacao?: string;
  repLevel?: string;
  repCurrentLevel?: string;
  taxaAtrasos?: number;
  repDelayedHtRate?: number;
  taxaReclamacoes?: number;
  repClaimsRate?: number;
  taxaCancelamentos?: number;
  repCancellationsRate?: number;
  // fields used to reaggregate M-1
  tgmv?: number;
  gmv?: number;
  adsInvestment?: number;
  llStockAvailabilityScore?: number;
  tgmvFull?: number;
  tgmvFlex?: number;
  pctFull?: number;
  pctFlex?: number;
}

interface Props {
  seller?: Seller | null;
  allKpis: KpiLike[];
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Metas oficiais de participação logística
const META_FULL = 50;   // % ideal do GMV via Full para T1
const META_FLEX = 15;   // % mínimo saudável de Flex
const META_ENVIOS_OK = 65; // Full + Flex combinados (envios geridos ML)

type Status = "ok" | "warn" | "critical" | "na";

function statusIcon(s: Status) {
  if (s === "ok") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald" />;
  if (s === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-warning" />;
  if (s === "critical") return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <span className="w-3.5 h-3.5 inline-block rounded-full border border-border/60" />;
}

function statusColor(s: Status) {
  if (s === "ok") return "text-emerald";
  if (s === "warn") return "text-warning";
  if (s === "critical") return "text-destructive";
  return "text-muted-foreground";
}

// ---- Month aggregation helpers (for M-1 delta arrows) ----
type MonthAgg = {
  receita: number;
  invAds: number;
  tgmvFull: number;
  tgmvFlex: number;
  oosSum: number;
  oosN: number;
  bsSum: number;
  bsN: number;
};

function monthKeyOf(d: string): string {
  return d.length >= 7 ? d.slice(0, 7) : "";
}

function aggregateByMonth(kpis: KpiLike[]): Map<string, MonthAgg> {
  const map = new Map<string, MonthAgg>();
  for (const k of kpis) {
    if (!k.date) continue;
    const key = monthKeyOf(k.date);
    if (!key) continue;
    const cur = map.get(key) ?? {
      receita: 0, invAds: 0, tgmvFull: 0, tgmvFlex: 0,
      oosSum: 0, oosN: 0, bsSum: 0, bsN: 0,
    };
    cur.receita += Number(k.tgmv) || Number(k.gmv) || 0;
    cur.invAds += Number(k.adsInvestment) || 0;
    cur.tgmvFull += Number(k.tgmvFull) || 0;
    cur.tgmvFlex += Number(k.tgmvFlex) || 0;
    const stock = Number(k.llStockAvailabilityScore) || 0;
    if (stock > 0) { cur.oosSum += 100 - stock; cur.oosN += 1; }
    const bsVal = Number(k.repCancellationsRate) || 0;
    if (bsVal > 0) { cur.bsSum += bsVal; cur.bsN += 1; }
    map.set(key, cur);
  }
  return map;
}

function derived(m: MonthAgg | undefined) {
  if (!m) return null;
  const sowPads = m.receita > 0 ? (m.invAds / m.receita) * 100 : NaN;
  const oos = m.oosN > 0 ? m.oosSum / m.oosN : NaN;
  const bs = m.bsN > 0 ? (m.bsSum / m.bsN) * 100 : NaN;
  const full = m.receita > 0 ? (m.tgmvFull / m.receita) * 100 : NaN;
  const flex = m.receita > 0 ? (m.tgmvFlex / m.receita) * 100 : NaN;
  const envios = Number.isFinite(full) && Number.isFinite(flex) ? full + flex : NaN;
  return { sowPads, oos, bs, full, flex, envios };
}

// Direction of "better": for OOS/Bad Seller, lower is better.
function DeltaArrow({ curr, prev, lowerIsBetter = false, unit = "pp" }: {
  curr: number; prev: number | undefined; lowerIsBetter?: boolean; unit?: "pp" | "%";
}) {
  if (prev === undefined || !Number.isFinite(prev) || !Number.isFinite(curr)) {
    return <span className="text-[9px] text-muted-foreground/60 tabular-nums">·</span>;
  }
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground tabular-nums">
        <Minus className="w-2.5 h-2.5" />0.0{unit}
      </span>
    );
  }
  const isUp = delta > 0;
  const good = lowerIsBetter ? !isUp : isUp;
  const color = good ? "text-emerald" : "text-destructive";
  const Icon = isUp ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] tabular-nums ${color}`}>
      <Icon className="w-2.5 h-2.5" />
      {(isUp ? "+" : "")}{delta.toFixed(1)}{unit}
    </span>
  );
}

const SellerDiagnosticPanel = ({ seller, allKpis }: Props) => {
  if (!seller) return null;

  // ---- Latest KPI (max date) ----
  const latest = [...allKpis]
    .filter((k) => k.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || {} as KpiLike;

  // ---- M-1 aggregates (reagregação de sellers_kpi por mês) ----
  const monthly = aggregateByMonth(allKpis);
  const monthsSorted = Array.from(monthly.keys()).sort();
  const currKey = monthsSorted[monthsSorted.length - 1];
  const prevKey = monthsSorted.length >= 2 ? monthsSorted[monthsSorted.length - 2] : undefined;
  const cur = derived(currKey ? monthly.get(currKey) : undefined);
  const prv = derived(prevKey ? monthly.get(prevKey) : undefined);

  // ---- Tempo no programa ----
  const dates = allKpis.map((k) => k.date).filter(Boolean).sort() as string[];
  let tempoPrograma = "—";
  if (dates.length >= 2) {
    const first = parseLocalDate(dates[0]);
    const last = parseLocalDate(dates[dates.length - 1]);
    const months = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    tempoPrograma = `${months} ${months === 1 ? "mês" : "meses"}`;
  }

  // ---- Classificação oficial ----
  const { data: lojas } = useClassificacaoLojas();
  const loja = lojas?.find((l) => l.sellerId === seller.id);
  const tierLabels: Record<1 | 2 | 3, string> = {
    1: "Tier 1 · Platinum",
    2: "Tier 2 · Gold",
    3: "Tier 3 · Silver",
  };
  const tierValue = loja ? tierLabels[loja.tier] : "—";
  const nextTier = loja && loja.tier > 1 ? ((loja.tier - 1) as 1 | 2) : null;
  const nextTh = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  // ---- Reputação ----
  const repLevel = String(
    latest.nivelReputacao || latest.repLevel || latest.repCurrentLevel || loja?.repLevel || "",
  ).toLowerCase();
  const repIsGreen = repLevel.includes("green") || repLevel.includes("platinum") || repLevel.includes("gold") || repLevel.includes("silver");
  const repLabel = repIsGreen
    ? repLevel.replace("green_", "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : repLevel
      ? repLevel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "—";
  const repStatus: Status = !repLevel
    ? "na"
    : repLevel.includes("red")
      ? "critical"
      : repLevel.includes("orange") || repLevel.includes("yellow")
        ? "warn"
        : "ok";

  // ---- Envios / Full / Flex ----
  // Prefer month-aggregated share (consistente com M-1); fallback to snapshot fields.
  const shareFull = Number.isFinite(cur?.full as number) ? (cur!.full as number)
    : (Number(latest.shareFullPct) || Number(latest.pctFull) || 0);
  const shareFlex = Number.isFinite(cur?.flex as number) ? (cur!.flex as number)
    : (Number(latest.shareFlexPct) || Number(latest.pctFlex) || 0);
  const shareEnvios = shareFull + shareFlex;

  const fullStatus: Status = shareFull >= META_FULL ? "ok" : shareFull >= META_FULL * 0.6 ? "warn" : "critical";
  const flexStatus: Status = shareFlex >= META_FLEX ? "ok" : shareFlex >= META_FLEX * 0.5 ? "warn" : "critical";
  const enviosStatus: Status = shareEnvios >= META_ENVIOS_OK ? "ok" : shareEnvios >= META_ENVIOS_OK * 0.7 ? "warn" : "critical";

  // ---- Tier metrics (do useClassificacaoLojas) ----
  const met = loja?.metricas;
  const chk = loja?.tierChecks;
  const sowStatus: Status = !chk ? "na" : chk.sowPads === "ok" ? "ok" : "critical";
  const oosStatus: Status = !chk ? "na" : chk.oos === "na" ? "na" : chk.oos === "ok" ? "ok" : "warn";
  const bsStatus: Status = !chk ? "na" : chk.bs === "na" ? "na" : chk.bs === "ok" ? "ok" : "critical";

  // ---- Info rows ----
  const infoRows: { icon: any; label: string; value: string; status?: Status; tip: string }[] = [
    {
      icon: Award, label: "Tier ML", value: tierValue,
      tip: "Classificação oficial do vendedor no Mercado Livre (Platinum, Gold, Silver). Prioriza nível de reputação e, na ausência, aplica critérios de SoW Pads, OOS e Bad Seller.",
    },
    {
      icon: Clock, label: "Tempo Programa", value: tempoPrograma,
      tip: "Meses de histórico do seller no programa (do primeiro ao último KPI carregado). Sellers com >6 meses têm base estatística mais confiável para benchmarks.",
    },
    {
      icon: Layers, label: "Segmentação", value: seller.cluster || "—",
      tip: "Cluster estratégico do seller (Emerging, Core, Elite). Define benchmarks aplicáveis e a esteira de crescimento esperada dentro da carteira.",
    },
    {
      icon: Tag, label: "Sub Categoria", value: seller.subCluster || "—",
      tip: "Sub-cluster dentro da segmentação principal, usado para comparar contra pares mais próximos no mesmo estágio de maturidade.",
    },
    {
      icon: MapPin, label: "Localização", value: seller.state || "—",
      tip: "UF do centro de operação do seller. Afeta cobertura Flex, prazo percebido e elegibilidade a benefícios logísticos regionais.",
    },
    {
      icon: ShieldCheck, label: "Reputação", value: repLabel, status: repStatus,
      tip: "Nível oficial de reputação (Green Platinum/Gold/Silver). Vermelho/amarelo bloqueia benefícios ML (buy box, empréstimos, exposição).",
    },
  ];

  // ---- Advancement criteria rows ----
  const criticalRows: {
    icon: any;
    label: string;
    current: string;
    target: string;
    status: Status;
    tip: string;
    curr?: number;
    prev?: number;
    lowerIsBetter?: boolean;
  }[] = [];

  // Tier metrics
  if (loja && nextTh) {
    const prevSow = prv?.sowPads;
    criticalRows.push({
      icon: Award,
      label: `Avançar p/ ${tierLabels[nextTier!]}`,
      current: `SoW Pads ${met!.sowPadsPct.toFixed(2)}%`,
      target: `≥ ${nextTh.sowPads}%`,
      status: met!.sowPadsPct >= nextTh.sowPads ? "ok" : "critical",
      tip: "Investimento em Product Ads sobre o GMV. Aumentar campanhas PADS para elevar o SoW.",
      curr: met!.sowPadsPct,
      prev: prevSow,
      lowerIsBetter: false,
    });
    criticalRows.push({
      icon: Package,
      label: "OOS (ruptura)",
      current: Number.isFinite(met!.oosPct) ? `${met!.oosPct.toFixed(1)}%` : "—",
      target: `≤ ${nextTh.oos}%`,
      status: met!.oosPct <= nextTh.oos ? "ok" : "warn",
      tip: "Percentual de rupturas de estoque. Melhorar reabastecimento e cobertura no Full.",
      curr: met!.oosPct,
      prev: prv?.oos,
      lowerIsBetter: true,
    });
    criticalRows.push({
      icon: ShieldCheck,
      label: "Bad Seller",
      current: Number.isFinite(met!.bsPct) ? `${met!.bsPct.toFixed(2)}%` : "—",
      target: `≤ ${nextTh.bs}%`,
      status: met!.bsPct <= nextTh.bs ? "ok" : "critical",
      tip: "Taxa de cancelamentos (proxy Bad Seller). Reduzir cancelamentos por seller para avançar.",
      curr: met!.bsPct,
      prev: prv?.bs,
      lowerIsBetter: true,
    });
  } else if (loja) {
    criticalRows.push({
      icon: Award,
      label: "Tier já é Platinum",
      current: `SoW Pads ${met!.sowPadsPct.toFixed(2)}%`,
      target: `manter ≥ ${TIER_THRESHOLDS[1].sowPads}%`,
      status: sowStatus,
      tip: "Manter as métricas oficiais acima do limite para preservar o Tier 1.",
      curr: met!.sowPadsPct,
      prev: prv?.sowPads,
      lowerIsBetter: false,
    });
  }

  // Segmentação — só informativo
  criticalRows.push({
    icon: Layers,
    label: "Segmentação",
    current: seller.cluster || "—",
    target: "aderente à categoria",
    status: seller.cluster && seller.cluster !== "—" ? "ok" : "na",
    tip: "Cluster estratégico define benchmarks. Sellers Emerging avançam para Core ao dobrar GMV mensal sustentado.",
  });

  // Reputação
  criticalRows.push({
    icon: ShieldCheck,
    label: "Reputação",
    current: repLabel,
    target: "Green (Silver+)",
    status: repStatus,
    tip: "Reputação vermelha/amarela bloqueia benefícios ML. Reduzir atrasos, cancelamentos e reclamações.",
  });

  // Full
  criticalRows.push({
    icon: Package,
    label: "% Full (GMV)",
    current: `${shareFull.toFixed(1)}%`,
    target: `≥ ${META_FULL}%`,
    status: fullStatus,
    tip: "Participação do Full no GMV. Migrar SKUs A/B para o Full aumenta conversão e reputação.",
    curr: shareFull,
    prev: prv?.full,
    lowerIsBetter: false,
  });

  // Flex
  criticalRows.push({
    icon: Zap,
    label: "% Flex (GMV)",
    current: `${shareFlex.toFixed(1)}%`,
    target: `≥ ${META_FLEX}%`,
    status: flexStatus,
    tip: "Participação do Flex no GMV. Cobertura Flex melhora prazo percebido em SP/capitais.",
    curr: shareFlex,
    prev: prv?.flex,
    lowerIsBetter: false,
  });

  // Envios (Full + Flex)
  criticalRows.push({
    icon: Truck,
    label: "% Envios ML (Full+Flex)",
    current: `${shareEnvios.toFixed(1)}%`,
    target: `≥ ${META_ENVIOS_OK}%`,
    status: enviosStatus,
    tip: "Combinação Full + Flex. Envios geridos pelo ML têm mais buy box e menor taxa de reclamação.",
    curr: shareEnvios,
    prev: prv?.envios,
    lowerIsBetter: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3 sm:p-4"
    >
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1 h-4 bg-neon-blue rounded-full" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            Diagnóstico do Seller
          </h3>
          <TooltipInfo text="Informações estratégicas do seller e pontos críticos para avançar Tier, Reputação e mix logístico (Full/Flex)." />
        </div>
        {loja && (
          <span className="text-[9px] sm:text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full whitespace-nowrap">
            Fonte tier: {loja.tierFonte === "reputacao" ? "reputação" : loja.tierFonte === "metricas" ? "métricas oficiais" : "fallback receita"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Info do seller */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Informações</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
            {infoRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-1.5 py-1 border-b border-border/30 min-w-0"
              >
                <r.icon className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground shrink-0 inline-flex items-center">
                  {r.label}:<TooltipInfo text={r.tip} />
                </span>
                <span className={`text-[11px] font-medium truncate ${r.status ? statusColor(r.status) : "text-foreground"}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pontos críticos */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Pontos críticos para avançar
            <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
              (setas comparam com {prevKey ? prevKey.split("-").reverse().join("/") : "mês anterior"})
            </span>
          </p>
          <div className="space-y-1">
            {criticalRows.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 py-1 px-2 rounded-md hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0 flex-1">
                  {statusIcon(r.status)}
                  <r.icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{r.label}</span>
                  <TooltipInfo text={r.tip} />
                </div>
                <div className="flex items-center gap-2 text-[11px] shrink-0">
                  <span className={`font-medium tabular-nums ${statusColor(r.status)}`}>{r.current}</span>
                  {r.curr !== undefined && (
                    <DeltaArrow curr={r.curr} prev={r.prev} lowerIsBetter={r.lowerIsBetter} unit="pp" />
                  )}
                  <span className="text-muted-foreground/70 tabular-nums">→ {r.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SellerDiagnosticPanel;