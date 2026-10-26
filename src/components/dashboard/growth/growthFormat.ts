/** Formatação North Star — abreviação limpa para consultoria (R$ 280 M). */

export function fmtMoneyGrowth(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const v = (abs / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: abs >= 10_000_000 ? 0 : 1,
      maximumFractionDigits: abs >= 10_000_000 ? 0 : 1,
    });
    return `${sign}R$ ${v} M`;
  }
  if (abs >= 1_000) {
    const v = (abs / 1_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    return `${sign}R$ ${v} mil`;
  }
  return (
    sign +
    abs.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    })
  );
}

export function fmtIntGrowth(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function fmtRoasGrowth(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}x`;
}

export function fmtPctGrowth(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function fmtCpvGrowth(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
