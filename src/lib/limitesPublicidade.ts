import { validarSettings, type SettingsInput } from '../../supabase/functions/_shared/mlGestao';
import { type Limites } from '../../supabase/functions/_shared/mlAdsGestao';

export const CAMPOS_LIMITES = [
  { chave: 'alerta_tacos', nome: 'TACOS máximo', unidade: '%', fracao: true },
  { chave: 'alerta_acos', nome: 'ACOS máximo', unidade: '%', fracao: true },
  { chave: 'alerta_roas', nome: 'ROAS mínimo', unidade: 'x', fracao: false },
  { chave: 'alerta_ctr', nome: 'CTR mínimo', unidade: '%', fracao: true },
  { chave: 'alerta_cpc', nome: 'CPC máximo', unidade: 'R$', fracao: false },
  { chave: 'meta_investimento_ads', nome: 'Meta de investimento sobre faturamento', unidade: '%', fracao: true },
] as const;

export type FormLimites = Record<keyof Limites, string>;
export function formularioLimites(limites: Limites): FormLimites {
  const form = {} as FormLimites;
  for (const c of CAMPOS_LIMITES) form[c.chave] = String(Number((limites[c.chave] * (c.fracao ? 100 : 1)).toFixed(8))).replace('.', ',');
  return form;
}

/** Envia somente campos editados, sem substituir configurações alheias ou orçamentos. */
export function prepararLimites(form: FormLimites, inicial: FormLimites): { valores: SettingsInput; erro: null } | { valores: null; erro: string } {
  const valores: SettingsInput = {};
  for (const c of CAMPOS_LIMITES) {
    if (form[c.chave] === inicial[c.chave]) continue;
    const texto = form[c.chave].trim();
    if (!/^\d+(?:[.,]\d+)?$/.test(texto)) return { valores: null, erro: `${c.nome}: informe um número não negativo.` };
    const n = Number(texto.replace(',', '.')) / (c.fracao ? 100 : 1);
    if (!Number.isFinite(n) || (c.fracao && n > 1)) return { valores: null, erro: `${c.nome}: informe um valor entre 0 e 100%.` };
    valores[c.chave] = n;
  }
  if (!Object.keys(valores).length) return { valores: null, erro: 'Nenhum limite foi alterado.' };
  const validado = validarSettings(valores);
  return validado.ok ? { valores: validado.valores, erro: null } : { valores: null, erro: 'Confira os limites informados.' };
}