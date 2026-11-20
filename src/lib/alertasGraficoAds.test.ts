import { describe, expect, it } from 'vitest';
import { rompeLimiteAds } from './alertasGraficoAds';
import { LIMITES_PADRAO } from '../../supabase/functions/_shared/mlAdsGestao';
const limites = { ...LIMITES_PADRAO, alerta_tacos: 0.10, alerta_acos: 0.35, alerta_roas: 3 };
describe('rupturas nos gráficos de publicidade', () => {
  for (const [metrica, ruim, igual, bom] of [
    ['tacos', 0.11, 0.10, 0.09], ['acos', 0.36, 0.35, 0.34], ['roas', 2.9, 3, 3.1],
    ['ctr', 0.0009, 0.001, 0.0011], ['cpc', 3.51, 3.5, 3.49],
  ] as const) it(`marca somente o lado desfavorável de ${metrica}`, () => {
    expect(rompeLimiteAds(metrica, ruim, limites)).toBe(true);
    expect(rompeLimiteAds(metrica, igual, limites)).toBe(false);
    expect(rompeLimiteAds(metrica, bom, limites)).toBe(false);
  });
  it('respeita mudança do limite da loja', () => {
    expect(rompeLimiteAds('roas', 4, limites)).toBe(false);
    expect(rompeLimiteAds('roas', 4, { ...limites, alerta_roas: 5 })).toBe(true);
  });
  it('não marca ausências, inválidos nem indicadores sem meta comparável', () => {
    for (const valor of [null, undefined, NaN, Infinity, -1]) expect(rompeLimiteAds('roas', valor, limites)).toBe(false);
    for (const m of ['faturamento', 'investimento', 'cliques']) expect(rompeLimiteAds(m, 10000, limites)).toBe(false);
    expect(rompeLimiteAds('roas', 0)).toBe(false);
  });
  it('zero medido fica abaixo de ROAS mínimo', () => expect(rompeLimiteAds('roas', 0, limites)).toBe(true));
});