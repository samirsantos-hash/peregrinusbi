import type { Limites } from '../../supabase/functions/_shared/mlAdsGestao';
import { brl, pctFracao, vezes } from '@/lib/format';

export type MetricaAlertaAds = 'roas' | 'acos' | 'tacos' | 'ctr' | 'cpc';
const REGRAS = {
  roas: { chave: 'alerta_roas', minimo: true },
  acos: { chave: 'alerta_acos', minimo: false },
  tacos: { chave: 'alerta_tacos', minimo: false },
  ctr: { chave: 'alerta_ctr', minimo: true },
  cpc: { chave: 'alerta_cpc', minimo: false },
} as const;

export function limiteGraficoAds(metrica: string, limites?: Limites) {
  if (!limites || !(metrica in REGRAS)) return null;
  const regra = REGRAS[metrica as MetricaAlertaAds];
  const valor = limites[regra.chave];
  return Number.isFinite(valor) && valor >= 0 ? { valor, minimo: regra.minimo } : null;
}

/** Equality is on target; unknown or invalid observations never become alerts. */
export function rompeLimiteAds(metrica: string, valor: unknown, limites?: Limites): boolean {
  const alvo = limiteGraficoAds(metrica, limites);
  return !!alvo && typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && (alvo.minimo ? valor < alvo.valor : valor > alvo.valor);
}

export function motivoAlertaAds(metrica: string, valor: unknown, limites?: Limites): string | null {
  if (!rompeLimiteAds(metrica, valor, limites) || typeof valor !== 'number') return null;
  const alvo = limiteGraficoAds(metrica, limites);
  if (!alvo) return null;
  const fmt = (v: number) => metrica === 'roas' ? vezes(v) : metrica === 'cpc' ? brl(v) : pctFracao(v, 2);
  return `${metrica.toUpperCase()} ${fmt(valor)} ${alvo.minimo ? 'abaixo do mínimo' : 'acima do máximo'} ${fmt(alvo.valor)}`;
}