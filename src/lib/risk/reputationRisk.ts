/**
 * Reputação — thresholds uniformes 2% / 5% (CppReputationAlert.tsx),
 * apenas claims e delayed. Cancellations é ignorado (coluna zerada na base).
 * Rates em fração (0..1); convertidos para % antes da comparação.
 */

export type ReputationLevel = "ok" | "atencao" | "critico";
export const REP_WARN_PCT = 2;
export const REP_CRIT_PCT = 5;

export interface ReputationSignal {
  metric: "claims" | "delayed";
  pct: number;
  level: ReputationLevel;
}

function classify(pct: number): ReputationLevel {
  if (pct >= REP_CRIT_PCT) return "critico";
  if (pct >= REP_WARN_PCT) return "atencao";
  return "ok";
}

export function evaluateReputation(row: {
  rep_claims_rate?: number | null;
  rep_delayed_ht_rate?: number | null;
}): ReputationSignal[] {
  const claimsPct = (Number(row.rep_claims_rate) || 0) * 100;
  const delayedPct = (Number(row.rep_delayed_ht_rate) || 0) * 100;
  return [
    { metric: "claims", pct: claimsPct, level: classify(claimsPct) },
    { metric: "delayed", pct: delayedPct, level: classify(delayedPct) },
  ];
}