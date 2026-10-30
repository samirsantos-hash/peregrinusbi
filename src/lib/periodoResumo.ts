/** Helpers de período do Resumo Growth — datas locais, sem drift UTC do toISOString. */

export function formatarPeriodoBr(ini: string, fim: string): string {
  const br = (s: string) => s.slice(0, 10).split("-").reverse().join("/");
  return `${br(ini)} a ${br(fim)}`;
}

/** Soma/subtrai dias em calendário local a partir de YYYY-MM-DD. */
export function adicionarDiasIso(iso: string, dias: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d + dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Duração inclusiva em dias entre duas datas ISO. */
export function diasInclusive(ini: string, fim: string): number {
  const [y1, m1, d1] = ini.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = fim.slice(0, 10).split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((b - a) / 864e5) + 1;
}
