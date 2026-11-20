import { describe, expect, it } from 'vitest';
import { formularioLimites, prepararLimites } from './limitesPublicidade';
import { LIMITES_PADRAO } from '../../supabase/functions/_shared/mlAdsGestao';

describe('limites independentes de publicidade', () => {
  const inicial = formularioLimites(LIMITES_PADRAO);
  for (const [chave, texto, valor] of [
    ['alerta_tacos', '10', 0.1], ['alerta_acos', '35', 0.35], ['alerta_roas', '3', 3],
    ['alerta_ctr', '0,15', 0.0015], ['alerta_cpc', '2,50', 2.5], ['meta_investimento_ads', '7', 0.07],
  ] as const) {
    it(`configura ${chave} sem modificar outro KPI ou orçamento`, () => {
      expect(prepararLimites({ ...inicial, [chave]: texto }, inicial)).toEqual({ valores: { [chave]: valor }, erro: null });
    });
  }
  it('preserva valores atuais ao abrir', () => {
    expect(inicial).toEqual({ alerta_tacos: '5', alerta_acos: '10', alerta_roas: '5', alerta_ctr: '0,1', alerta_cpc: '3,5', meta_investimento_ads: '3' });
  });
  it('não converte ausência ou texto inválido em zero', () => {
    for (const texto of ['', ' ', '-1', 'abc', '101', 'Infinity']) {
      expect(prepararLimites({ ...inicial, alerta_tacos: texto }, inicial).valores).toBeNull();
    }
  });
  it('aceita limite zero explícito', () => {
    expect(prepararLimites({ ...inicial, alerta_tacos: '0' }, inicial).valores).toEqual({ alerta_tacos: 0 });
  });
});