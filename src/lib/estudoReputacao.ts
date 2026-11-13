export type MesReputacao = {
  id: string; seller_id: string; data: string;
  rep_claims_rate: number | null; rep_delayed_ht_rate: number | null;
  rep_cancellations_rate: number | null;
};

// Study references are not verified official eligibility thresholds.
export const REFERENCIAS_ESTUDO = [
  { key: 'rep_claims_rate', api: 'reclamacoes', nome: 'Reclamações', limite: 0.02 },
  { key: 'rep_delayed_ht_rate', api: 'atrasos', nome: 'Atrasos', limite: 0.05 },
  { key: 'rep_cancellations_rate', api: 'cancelamentos', nome: 'Cancelamentos', limite: 0.03 },
] as const;

export function fracaoMedida(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1 ? valor : null;
}

export function variacaoPp(atual: unknown, anterior: unknown): number | null {
  const a = fracaoMedida(atual), b = fracaoMedida(anterior);
  return a === null || b === null ? null : (a - b) * 100;
}

export function mesesFechados(rows: MesReputacao[], hoje: string, de?: string, ate?: string) {
  const mesAtual = hoje.slice(0, 7);
  return rows.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.data) && r.data.slice(0, 7) < mesAtual
    && (!de || r.data.slice(0, 7) >= de.slice(0, 7)) && (!ate || r.data.slice(0, 7) <= ate.slice(0, 7)))
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
}

export function comparacaoMensal(rows: MesReputacao[], key: typeof REFERENCIAS_ESTUDO[number]['key']) {
  const atual = rows.at(-1), anterior = rows.at(-2);
  if (!atual || !anterior || atual.seller_id !== anterior.seller_id) return null;
  const a = new Date(`${atual.data.slice(0, 7)}-01T00:00:00Z`);
  const b = new Date(`${anterior.data.slice(0, 7)}-01T00:00:00Z`);
  if ((a.getUTCFullYear() - b.getUTCFullYear()) * 12 + a.getUTCMonth() - b.getUTCMonth() !== 1) return null;
  return variacaoPp(atual[key], anterior[key]);
}