/**
 * Agrega sinais de risco (BPC, Reputação, Churn) por seller e classifica severidade
 * consolidada.
 *
 * Regras (aprovadas em F8):
 *   Alta   → ≥1 sinal de severidade alta   OU  ≥2 sinais de severidade média
 *   Média  → exatamente 1 sinal de severidade média
 *   Baixa  → nenhum sinal (não entra no painel)
 */

import { bpcThresholdFor, type BpcThresholdModel } from "./bpcThresholds";
import { evaluateReputation } from "./reputationRisk";
import {
  evaluateChurn,
  type ChurnStat,
  type SellerMonthTriplet,
} from "./churnRisk";

export type SeverityLevel = "alta" | "media";
export type SignalKind =
  | "bpc"
  | "reputacao_claims"
  | "reputacao_delayed"
  | "churn_relativo"
  | "churn_absoluto";

export interface RiskSignal {
  kind: SignalKind;
  severity: SeverityLevel;
  label: string;
  detail: string;
}

export interface RiskSellerInput {
  sellerId: string;
  custId: string;
  nickname: string;
  vertical: string | null;
  bpc: number | null;
  repClaimsRate: number | null;
  repDelayedRate: number | null;
  gmvClosed: number;
  triplet: SellerMonthTriplet;
}

export interface RiskSellerResult {
  sellerId: string;
  custId: string;
  nickname: string;
  vertical: string | null;
  gmvClosed: number;
  deltaPct: number | null;
  signals: RiskSignal[];
  severity: SeverityLevel;
}

function consolidate(signals: RiskSignal[]): SeverityLevel | null {
  if (signals.length === 0) return null;
  const highCount = signals.filter((s) => s.severity === "alta").length;
  const medCount = signals.filter((s) => s.severity === "media").length;
  if (highCount >= 1 || medCount >= 2) return "alta";
  if (medCount === 1) return "media";
  return null;
}

export function aggregateRisk(
  sellers: RiskSellerInput[],
  bpcModel: BpcThresholdModel,
  churnStats: Record<string, ChurnStat>,
): RiskSellerResult[] {
  const results: RiskSellerResult[] = [];

  for (const s of sellers) {
    const signals: RiskSignal[] = [];

    if (s.bpc !== null && Number.isFinite(s.bpc)) {
      const stat = bpcThresholdFor(bpcModel, s.vertical);
      if (s.bpc < stat.threshold) {
        signals.push({
          kind: "bpc",
          severity: "alta",
          label: "BPC baixo",
          detail: `BPC ${s.bpc.toFixed(3)} < ${stat.threshold.toFixed(3)} (μ ${stat.mean.toFixed(2)} · σ ${stat.sd.toFixed(2)} · fonte: ${stat.source})`,
        });
      }
    }

    const rep = evaluateReputation({
      rep_claims_rate: s.repClaimsRate,
      rep_delayed_ht_rate: s.repDelayedRate,
    });
    for (const r of rep) {
      if (r.level === "ok") continue;
      const sev: SeverityLevel = r.level === "critico" ? "alta" : "media";
      const isClaims = r.metric === "claims";
      signals.push({
        kind: isClaims ? "reputacao_claims" : "reputacao_delayed",
        severity: sev,
        label: isClaims ? "Reclamações" : "Atrasos",
        detail: `${isClaims ? "Reclamações" : "Atrasos"} ${r.pct.toFixed(2)}% (alerta ≥ 2% · crítico ≥ 5%)`,
      });
    }

    const churn = evaluateChurn(s.triplet, s.vertical, churnStats);
    for (const c of churn) {
      signals.push({
        kind: c.type === "absolute" ? "churn_absoluto" : "churn_relativo",
        severity: c.severity,
        label: c.type === "absolute" ? "Churn absoluto" : "Queda anômala",
        detail:
          c.message + (c.deltaPct !== undefined ? ` · Δ ${c.deltaPct.toFixed(1)}%` : ""),
      });
    }

    const severity = consolidate(signals);
    if (!severity) continue;

    const deltaPct =
      s.triplet.prior > 0
        ? ((s.triplet.closed - s.triplet.prior) / s.triplet.prior) * 100
        : null;

    results.push({
      sellerId: s.sellerId,
      custId: s.custId,
      nickname: s.nickname,
      vertical: s.vertical,
      gmvClosed: s.gmvClosed,
      deltaPct,
      signals,
      severity,
    });
  }

  const rank = (r: RiskSellerResult) => (r.severity === "alta" ? 2 : 1);
  results.sort((a, b) => {
    if (rank(b) !== rank(a)) return rank(b) - rank(a);
    if (b.signals.length !== a.signals.length) return b.signals.length - a.signals.length;
    return b.gmvClosed - a.gmvClosed;
  });

  return results;
}