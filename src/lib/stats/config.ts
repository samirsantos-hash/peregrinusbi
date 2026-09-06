/**
 * Limiares estatísticos ajustáveis sem deploy.
 *
 * Os valores default vivem aqui; a tabela `config_estimativa` (chave/valor) pode
 * sobrescrevê-los em runtime via `hidratarLimiares`, chamado pelo hook de config.
 */

export const LIMIARES_PADRAO = {
  /** |mz| acima disso vira alerta de churn (OS-1) */
  mad_z_alerta: 3.5,
  /** |mz| acima disso vira alerta de severidade média (OS-1) */
  mad_z_atencao: 3.0,
  /** taxa de falsas descobertas aceita no Benjamini-Hochberg (OS-3) */
  fdr_q: 0.05,
  /** n mínimo de pares para calcular correlação (OS-3) */
  correlacao_min_n: 30,
  /** nº mínimo de lojas para uma vertical servir de prior (OS-4) */
  prior_min_lojas: 10,
} as const;

export type ChaveLimiar = keyof typeof LIMIARES_PADRAO;

const overrides: Partial<Record<ChaveLimiar, number>> = {};

export function hidratarLimiares(rows: { chave: string; valor: number | string }[]) {
  for (const r of rows) {
    if (!(r.chave in LIMIARES_PADRAO)) continue;
    const v = Number(r.valor);
    if (!Number.isFinite(v)) {
      throw new Error(`config_estimativa: valor inválido para "${r.chave}"`);
    }
    overrides[r.chave as ChaveLimiar] = v;
  }
}

export function getLimiar(chave: ChaveLimiar): number {
  return overrides[chave] ?? LIMIARES_PADRAO[chave];
}
