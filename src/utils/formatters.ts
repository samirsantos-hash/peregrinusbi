/**
 * Formatação monetária pt-BR padronizada para todo o dashboard.
 */

/** Formata valor completo em BRL: R$ 1.041,00 */
export const fmtBRL = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formata valor compacto em BRL: R$ 1.041,0K ou R$ 2,30M */
export const fmtBRLCompact = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
  }
  return fmtBRL(value);
};

/** Formata número com locale pt-BR */
export const fmtNum = (value: number, decimals = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Formata percentual: +12,5% ou -3,2% */
export const fmtPct = (value: number, decimals = 1): string => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
};
