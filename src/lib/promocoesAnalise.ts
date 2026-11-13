// Leitura de promoções do Mercado Livre: rebate (parte paga pelo ML), vencimento e recomendação. Sem I/O.

export type PromoBase = {
  promotion_id: string;
  nome: string | null;
  tipo: string;
  status: string | null;
  fim: string | null;
  prazo: string | null;
  beneficios: { meli_percent?: number | null; seller_percent?: number | null } | null;
};

/** Dias até o vencimento que disparam o aviso amarelo. */
export const DIAS_AVISO_VENCIMENTO = 7;

const DIA_MS = 86_400_000;

export const rebatePct = (p: PromoBase): number | null => {
  const v = Number(p.beneficios?.meli_percent);
  return Number.isFinite(v) && v > 0 ? v : null;
};
export const vendedorPct = (p: PromoBase): number | null => {
  const v = Number(p.beneficios?.seller_percent);
  return Number.isFinite(v) && v >= 0 && p.beneficios?.seller_percent != null ? v : null;
};
/** Fatia do desconto bancada pelo ML (0–1). */
export const fatiaRebate = (p: PromoBase): number | null => {
  const m = rebatePct(p) ?? 0, s = vendedorPct(p);
  if (s == null && !m) return null;
  const t = m + (s ?? 0);
  return t > 0 ? m / t : null;
};

/** Data relevante de vencimento: prazo de adesão se futuro, senão fim da promoção. */
export function diasParaVencer(p: PromoBase, agora = Date.now()): number | null {
  const datas = [p.prazo, p.fim].filter(Boolean).map((d) => Date.parse(d!)).filter((t) => Number.isFinite(t) && t >= agora);
  if (!datas.length) return null;
  return Math.floor((Math.min(...datas) - agora) / DIA_MS);
}
export const venceEmBreve = (p: PromoBase, agora = Date.now()) => {
  const d = diasParaVencer(p, agora);
  return d != null && d <= DIAS_AVISO_VENCIMENTO;
};

const encerrada = (s: string | null) => ["finished", "expired", "cancelled"].includes((s ?? "").toLowerCase());

/** Promoção não encerrada com maior % de rebate do ML; empate fica com a que vence depois. */
export function recomendarPorRebate<T extends PromoBase>(lista: T[], agora = Date.now()): T | null {
  const ok = lista.filter((p) => !encerrada(p.status) && rebatePct(p) != null && (p.fim == null || Date.parse(p.fim) >= agora));
  if (!ok.length) return null;
  return [...ok].sort((a, b) => rebatePct(b)! - rebatePct(a)! || (Date.parse(b.fim ?? "") || 0) - (Date.parse(a.fim ?? "") || 0))[0];
}
