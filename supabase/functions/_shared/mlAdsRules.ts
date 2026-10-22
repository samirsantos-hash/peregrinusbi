export function canManageAds(superAdmin: unknown, perfil: unknown): boolean {
  return superAdmin === true || perfil === "consultor";
}

export function adsPeriod(days: number, now = new Date()) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  return {
    inicio: new Date(end.getTime() - days * 864e5).toISOString().slice(0, 10),
    fim: new Date(end.getTime() - 864e5).toISOString().slice(0, 10),
  };
}

export function adsNumber(value: unknown): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function adsRatios(cost: number | null, revenue: number | null, clicks: number | null, prints: number | null) {
  return {
    roas: cost != null && cost > 0 && revenue != null ? revenue / cost : null,
    acos: revenue != null && revenue > 0 && cost != null ? cost / revenue : null,
    cpc: clicks != null && clicks > 0 && cost != null ? cost / clicks : null,
    ctr: prints != null && prints > 0 && clicks != null ? clicks / prints : null,
  };
}