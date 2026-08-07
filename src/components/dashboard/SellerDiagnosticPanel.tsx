import { motion } from "framer-motion";
import {
  Award, Layers, Tag, MapPin, Clock, ShieldCheck, Truck, Package, Zap,
  CheckCircle2, AlertTriangle, XCircle, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
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
  pctFull?: number;
  pctFlex?: number;
  nivelReputacao?: string;
  repLevel?: string;
  repCurrentLevel?: string;
  tgmv?: number;
  gmv?: number;
  adsInvestment?: number;
  llStockAvailabilityScore?: number;
  repCancellationsRate?: number;
  tgmvFull?: number;
  tgmvFlex?: number;
}

interface Props {
  seller?: Seller | null;
  allKpis: KpiLike[];
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const META_FULL = 50;
const META_FLEX = 15;
const META_ENVIOS_OK = 65;

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

// ---- Reputação helpers ----
const REP_RANK: Record<string, number> = {
  green_platinum: 5, green_gold: 4, green_silver: 3, green: 3,
  yellow: 2, orange: 1, red: 0,
};
function repRank(level?: string | null): number | null {
  if (!level) return null;
  const k = String(level).toLowerCase();
  if (k in REP_RANK) return REP_RANK[k];
  if (k.includes("platinum")) return 5;
  if (k.includes("gold")) return 4;
  if (k.includes("silver") || k.includes("green")) return 3;
  if (k.includes("yellow")) return 2;
  if (k.includes("orange")) return 1;
  if (k.includes("red")) return 0;
  return null;
}
function repPretty(level?: string | null): string {
  if (!level) return "—";
  return String(level).replace(/^green_/, "").replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function repStatusFrom(level?: string | null): Status {
  if (!level) return "na";
  const k = String(level).toLowerCase();
  if (k.includes("red")) return "critical";
  if (k.includes("orange") || k.includes("yellow")) return "warn";
  return "ok";
}

// ---- Month aggregation (M-1) ----
type MonthAgg = {
  receita: number; invAds: number;
  tgmvFull: number; tgmvFlex: number;
  oosSum: number; oosN: number;
  bsSum: number; bsN: number;
  repLevel: string | null;
};

function aggregateByMonth(kpis: KpiLike[]): Map<string, MonthAgg> {
  const map = new Map<string, MonthAgg>();
  for (const k of kpis) {
    if (!k.date) continue;
    const key = k.date.slice(0, 7);
    if (!key) continue;
    const cur = map.get(key) ?? {
      receita: 0, invAds: 0, tgmvFull: 0, tgmvFlex: 0,
      oosSum: 0, oosN: 0, bsSum: 0, bsN: 0, repLevel: null,
    };
    cur.receita += Number(k.tgmv) || Number(k.gmv) || 0;
    cur.invAds += Number(k.adsInvestment) || 0;
    cur.tgmvFull += Number(k.tgmvFull) || 0;
    cur.tgmvFlex += Number(k.tgmvFlex) || 0;
    const stock = Number(k.llStockAvailabilityScore) || 0;
    if (stock > 0) { cur.oosSum += 100 - stock; cur.oosN += 1; }
    const bs = Number(k.repCancellationsRate) || 0;
    if (bs > 0) { cur.bsSum += bs; cur.bsN += 1; }
    const lvl = k.repCurrentLevel || k.repLevel || k.nivelReputacao || null;
    if (lvl) cur.repLevel = String(lvl);
    map.set(key, cur);
  }
  return map;
}

type Derived = {
  sowPads: number; oos: number; bs: number;
  full: number; flex: number; envios: number;
  repLevel: string | null;
};
function derived(m?: MonthAgg): Derived | null {
  if (!m) return null;
  return {
    sowPads: m.receita > 0 ? (m.invAds / m.receita) * 100 : NaN,
    oos: m.oosN > 0 ? m.oosSum / m.oosN : NaN,
    bs: m.bsN > 0 ? (m.bsSum / m.bsN) * 100 : NaN,
    full: m.receita > 0 ? (m.tgmvFull / m.receita) * 100 : NaN,
    flex: m.receita > 0 ? (m.tgmvFlex / m.receita) * 100 : NaN,
    envios: m.receita > 0 ? ((m.tgmvFull + m.tgmvFlex) / m.receita) * 100 : NaN,
    repLevel: m.repLevel,
  };
}

function repLevelToTier(level: string | null): 1 | 2 | 3 | null {
  if (!level) return null;
  const k = level.toLowerCase();
  if (k.includes("platinum")) return 1;
  if (k.includes("gold")) return 2;
  if (k.includes("silver")) return 3;
  return null;
}
function tierFromMetricas(sow: number, oos: number, bs: number): 1 | 2 | 3 {
  if (sow >= TIER_THRESHOLDS[1].sowPads && oos <= TIER_THRESHOLDS[1].oos && bs <= TIER_THRESHOLDS[1].bs) return 1;
  if (sow >= TIER_THRESHOLDS[2].sowPads && oos <= TIER_THRESHOLDS[2].oos && bs <= TIER_THRESHOLDS[2].bs) return 2;
  return 3;
}
function computeTier(d: Derived | null): 1 | 2 | 3 | null {
  if (!d) return null;
  const r = repLevelToTier(d.repLevel);
  if (r) return r;
  if (Number.isFinite(d.oos) && Number.isFinite(d.bs)) return tierFromMetricas(d.sowPads, d.oos, d.bs);
  return null;
}

// ---- Delta arrow (numeric) ----
function DeltaArrow({
  curr, prev, lowerIsBetter = false, unit = "pp", digits = 1,
}: { curr: number; prev?: number; lowerIsBetter?: boolean; unit?: string; digits?: number }) {
  if (prev === undefined || !Number.isFinite(prev) || !Number.isFinite(curr)) {
    return <span className="text-[9px] text-muted-foreground/50 tabular-nums w-14 text-right">—</span>;
  }
  const delta = curr - prev;
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground tabular-nums w-14 justify-end">
        <Minus className="w-2.5 h-2.5" />0.0{unit}
      </span>
    );
  }
  const up = delta > 0;
  const good = lowerIsBetter ? !up : up;
  const color = good ? "text-emerald" : "text-destructive";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] tabular-nums w-14 justify-end ${color}`}>
      <Icon className="w-2.5 h-2.5" />
      {(up ? "+" : "")}{delta.toFixed(digits)}{unit}
    </span>
  );
}

// ---- Categorical delta arrow (Tier / Reputação) ----
function CategoryArrow({
  currRank, prevRank, lowerIsBetter = false,
}: { currRank: number | null; prevRank: number | null; lowerIsBetter?: boolean }) {
  if (currRank == null || prevRank == null) {
    return <span className="text-[9px] text-muted-foreground/50 tabular-nums w-14 text-right">—</span>;
  }
  if (currRank === prevRank) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground tabular-nums w-14 justify-end">
        <Minus className="w-2.5 h-2.5" />estável
      </span>
    );
  }
  // For tier: rank lower = tier melhor? Here we pass rank so higher = better always.
  const up = currRank > prevRank;
  const good = lowerIsBetter ? !up : up;
  const color = good ? "text-emerald" : "text-destructive";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] tabular-nums w-14 justify-end ${color}`}>
      <Icon className="w-2.5 h-2.5" />{good ? "subiu" : "caiu"}
    </span>
  );
}

type Row = {
  icon: any;
  label: string;
  tip: string;
  value: string;
  valueColor?: string;
  target?: string;
  status: Status;
  // numeric delta
  curr?: number;
  prev?: number;
  lowerIsBetter?: boolean;
  unit?: string;
  digits?: number;
  // categorical delta
  currRank?: number | null;
  prevRank?: number | null;
  isCategorical?: boolean;
};

const SellerDiagnosticPanel = ({ seller, allKpis }: Props) => {
  const { data: lojas } = useClassificacaoLojas();

  if (!seller) return null;

  // ---- M-1 aggregates ----
  const monthly = aggregateByMonth(allKpis);
  const monthsSorted = Array.from(monthly.keys()).sort();
  const currKey = monthsSorted[monthsSorted.length - 1];
  const prevKey = monthsSorted.length >= 2 ? monthsSorted[monthsSorted.length - 2] : undefined;
  const cur = derived(currKey ? monthly.get(currKey) : undefined);
  const prv = derived(prevKey ? monthly.get(prevKey) : undefined);

  // ---- Tempo Programa ----
  const dates = allKpis.map((k) => k.date).filter(Boolean).sort() as string[];
  let tempoPrograma = "—";
  if (dates.length >= 2) {
    const first = parseLocalDate(dates[0]);
    const last = parseLocalDate(dates[dates.length - 1]);
    const months = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    tempoPrograma = `${months} ${months === 1 ? "mês" : "meses"}`;
  }

  // ---- Classificação oficial (para tier "fonte" e nextTh) ----
  const loja = lojas?.find((l) => l.sellerId === seller.id);
  const tierLabels: Record<1 | 2 | 3, string> = {
    1: "Tier 1 · Platinum",
    2: "Tier 2 · Gold",
    3: "Tier 3 · Silver",
  };

  // ---- Reputação M vs M-1 ----
  const repCurrentLvl = cur?.repLevel ?? loja?.repLevel ?? null;
  const repPrevLvl = prv?.repLevel ?? null;
  const repCurrentRank = repRank(repCurrentLvl);
  const repPrevRank = repRank(repPrevLvl);
  const repLabel = repPretty(repCurrentLvl);
  const repStatus = repStatusFrom(repCurrentLvl);

  // ---- Tier M vs M-1 (recalculado) ----
  const tierCurrent = computeTier(cur) ?? loja?.tier ?? null;
  const tierPrev = computeTier(prv);
  // Rank: quanto maior, melhor (Tier 1 = 3, Tier 2 = 2, Tier 3 = 1)
  const tierCurrRank = tierCurrent ? 4 - tierCurrent : null;
  const tierPrevRank = tierPrev ? 4 - tierPrev : null;
  const tierValue = tierCurrent ? tierLabels[tierCurrent] : "—";
  const nextTier = tierCurrent && tierCurrent > 1 ? ((tierCurrent - 1) as 1 | 2) : null;
  const nextTh = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  // ---- Full / Flex / Envios ----
  const shareFull = Number.isFinite(cur?.full as number) ? (cur!.full as number) : 0;
  const shareFlex = Number.isFinite(cur?.flex as number) ? (cur!.flex as number) : 0;
  const shareEnvios = shareFull + shareFlex;
  const fullStatus: Status = shareFull >= META_FULL ? "ok" : shareFull >= META_FULL * 0.6 ? "warn" : "critical";
  const flexStatus: Status = shareFlex >= META_FLEX ? "ok" : shareFlex >= META_FLEX * 0.5 ? "warn" : "critical";
  const enviosStatus: Status = shareEnvios >= META_ENVIOS_OK ? "ok" : shareEnvios >= META_ENVIOS_OK * 0.7 ? "warn" : "critical";

  // ---- SoW / OOS / BS (mês corrente reagregado, para consistência com M-1) ----
  const sowPadsPct = Number.isFinite(cur?.sowPads as number) ? (cur!.sowPads as number) : 0;
  const oosPct = Number.isFinite(cur?.oos as number) ? (cur!.oos as number) : NaN;
  const bsPct = Number.isFinite(cur?.bs as number) ? (cur!.bs as number) : NaN;

  // ---- Build rows (single table) ----
  const rows: Row[] = [];

  // Informações
  rows.push({
    icon: Award, label: "Tier ML",
    tip: "Classificação oficial no Mercado Livre (Platinum, Gold, Silver). Prioriza nível de reputação e, na ausência, aplica critérios de SoW Pads, OOS e Bad Seller.",
    value: tierValue, status: "na",
    isCategorical: true, currRank: tierCurrRank, prevRank: tierPrevRank,
  });
  rows.push({
    icon: ShieldCheck, label: "Reputação",
    tip: "Nível oficial de reputação. Vermelho/amarelo bloqueia benefícios do ML (buy box, exposição, crédito). Meta: manter Green (Silver+).",
    value: repLabel, status: repStatus, target: "Green (Silver+)",
    isCategorical: true, currRank: repCurrentRank, prevRank: repPrevRank,
  });
  rows.push({
    icon: Clock, label: "Tempo Programa",
    tip: "Meses de histórico do seller no programa (do primeiro ao último KPI carregado). Sellers com >6 meses têm base estatística mais confiável.",
    value: tempoPrograma, status: "na",
  });
  rows.push({
    icon: Layers, label: "Segmentação",
    tip: "Cluster estratégico do seller (Emerging, Core, Elite). Define benchmarks aplicáveis e a esteira de crescimento esperada.",
    value: seller.cluster || "—",
    status: seller.cluster && seller.cluster !== "—" ? "ok" : "na",
  });
  rows.push({
    icon: Tag, label: "Sub Categoria",
    tip: "Sub-cluster dentro da segmentação principal. Usado para comparar contra pares mais próximos no mesmo estágio.",
    value: seller.subCluster || "—", status: "na",
  });
  rows.push({
    icon: MapPin, label: "Localização",
    tip: "UF do centro de operação do seller. Afeta cobertura Flex, prazo percebido e elegibilidade a benefícios logísticos regionais.",
    value: seller.state || "—", status: "na",
  });

  // Métricas oficiais de tier (com M-1)
  const targetSow = nextTh ? nextTh.sowPads : TIER_THRESHOLDS[1].sowPads;
  const targetOos = nextTh ? nextTh.oos : TIER_THRESHOLDS[1].oos;
  const targetBs = nextTh ? nextTh.bs : TIER_THRESHOLDS[1].bs;
  const sowLabel = nextTier ? `SoW Pads (avançar p/ ${tierLabels[nextTier]})` : "SoW Pads (manter Tier 1)";

  rows.push({
    icon: Award, label: sowLabel,
    tip: "Investimento em Product Ads sobre o GMV (Share of Wallet). Aumentar campanhas PADS acelera avanço de tier.",
    value: `${sowPadsPct.toFixed(2)}%`,
    target: `≥ ${targetSow}%`,
    status: sowPadsPct >= targetSow ? "ok" : "critical",
    curr: sowPadsPct, prev: prv?.sowPads, lowerIsBetter: false, unit: "pp", digits: 2,
  });
  rows.push({
    icon: Package, label: "OOS (ruptura de estoque)",
    tip: "Percentual de rupturas. Quanto menor, melhor. Melhore reabastecimento e cobertura no Full para reduzir.",
    value: Number.isFinite(oosPct) ? `${oosPct.toFixed(1)}%` : "—",
    target: `≤ ${targetOos}%`,
    status: !Number.isFinite(oosPct) ? "na" : oosPct <= targetOos ? "ok" : "warn",
    curr: oosPct, prev: prv?.oos, lowerIsBetter: true, unit: "pp",
  });
  rows.push({
    icon: ShieldCheck, label: "Bad Seller",
    tip: "Taxa de cancelamentos (proxy Bad Seller do ML). Quanto menor, melhor. Reduzir cancelamentos por seller para avançar de tier.",
    value: Number.isFinite(bsPct) ? `${bsPct.toFixed(2)}%` : "—",
    target: `≤ ${targetBs}%`,
    status: !Number.isFinite(bsPct) ? "na" : bsPct <= targetBs ? "ok" : "critical",
    curr: bsPct, prev: prv?.bs, lowerIsBetter: true, unit: "pp", digits: 2,
  });

  // Mix logístico
  rows.push({
    icon: Package, label: "% Full (GMV)",
    tip: "Participação do Full no GMV total. Migrar SKUs A/B para o Full aumenta conversão, reputação e cobertura.",
    value: `${shareFull.toFixed(1)}%`,
    target: `≥ ${META_FULL}%`,
    status: fullStatus,
    curr: shareFull, prev: prv?.full, lowerIsBetter: false, unit: "pp",
  });
  rows.push({
    icon: Zap, label: "% Flex (GMV)",
    tip: "Participação do Flex no GMV. Cobertura Flex melhora o prazo percebido em SP e capitais, elevando conversão.",
    value: `${shareFlex.toFixed(1)}%`,
    target: `≥ ${META_FLEX}%`,
    status: flexStatus,
    curr: shareFlex, prev: prv?.flex, lowerIsBetter: false, unit: "pp",
  });
  rows.push({
    icon: Truck, label: "% Envios ML (Full+Flex)",
    tip: "Combinação Full + Flex. Envios geridos pelo ML têm mais buy box e menor taxa de reclamação vs correios/agência.",
    value: `${shareEnvios.toFixed(1)}%`,
    target: `≥ ${META_ENVIOS_OK}%`,
    status: enviosStatus,
    curr: shareEnvios, prev: prv?.envios, lowerIsBetter: false, unit: "pp",
  });

  const fmtMonth = (k?: string) =>
    k ? k.split("-").reverse().slice(0, 2).join("/") : "—";

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
            Página do seller Mercado Livre
          </h3>
          <TooltipInfo text="Ficha do seller no Mercado Livre: informações estratégicas e pontos críticos para avançar Tier, Reputação e mix logístico. Setas comparam o mês corrente com o mês fechado anterior." />
        </div>
        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
          <span className="bg-muted/30 px-2 py-0.5 rounded-full whitespace-nowrap">
            Δ: {fmtMonth(currKey)} vs {fmtMonth(prevKey)}
          </span>
          {loja && (
            <span className="bg-muted/30 px-2 py-0.5 rounded-full whitespace-nowrap">
              Fonte tier: {loja.tierFonte === "reputacao" ? "reputação" : loja.tierFonte === "metricas" ? "métricas oficiais" : "fallback receita"}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
              <th className="text-left font-normal py-1.5 pl-1 pr-2">Indicador</th>
              <th className="text-right font-normal py-1.5 px-2">Atual</th>
              <th className="text-right font-normal py-1.5 px-2">Δ M-1</th>
              <th className="text-right font-normal py-1.5 px-2">Meta</th>
              <th className="text-center font-normal py-1.5 pl-2 pr-1 w-8">•</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-border/20 hover:bg-muted/20 transition-colors"
              >
                <td className="py-1.5 pl-1 pr-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                    <r.icon className="w-3 h-3 shrink-0" />
                    <span className="truncate text-foreground/90">{r.label}</span>
                    <TooltipInfo text={r.tip} />
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right">
                  <span className={`font-medium tabular-nums ${statusColor(r.status)}`}>
                    {r.value}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-right">
                  {r.isCategorical ? (
                    <CategoryArrow
                      currRank={r.currRank ?? null}
                      prevRank={r.prevRank ?? null}
                      lowerIsBetter={r.lowerIsBetter}
                    />
                  ) : r.curr !== undefined ? (
                    <DeltaArrow
                      curr={r.curr}
                      prev={r.prev}
                      lowerIsBetter={r.lowerIsBetter}
                      unit={r.unit ?? "pp"}
                      digits={r.digits ?? 1}
                    />
                  ) : (
                    <span className="text-[9px] text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right text-muted-foreground/70 tabular-nums">
                  {r.target ?? "—"}
                </td>
                <td className="py-1.5 pl-2 pr-1 text-center">
                  {statusIcon(r.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default SellerDiagnosticPanel;