/**
 * Formatação monetária padronizada para todo o dashboard.
 * Usa ponto como separador de milhar e vírgula como decimal.
 */

/** Formata valor completo em BRL: R$ 1.041,00 */
export const fmtBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formata valor compacto em BRL: R$ 1.041.0K ou R$ 2.30M (separador de milhar por ponto) */
export const fmtBRLCompact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    const v = (value / 1_000_000).toFixed(2);
    return `R$ ${v}M`;
  }
  if (Math.abs(value) >= 1_000) {
    const v = (value / 1_000).toFixed(1);
    return `R$ ${v}K`;
  }
  return fmtBRL(value);
};

/** Formata número com ponto decimal */
export const fmtNum = (value: number, decimals = 2): string =>
  value.toFixed(decimals);

/** Formata número compacto: 1K, 100K, 2.5M (sem casas decimais para K) */
export const fmtNumCompact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    const v = (value / 1_000_000).toFixed(1);
    return `${v}M`;
  }
  if (Math.abs(value) >= 1_000) {
    const v = Math.round(value / 1_000);
    return `${v}K`;
  }
  return String(Math.round(value));
};

/** Formata percentual: +12.5% ou -3.2% */
export const fmtPct = (value: number, decimals = 1): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};
