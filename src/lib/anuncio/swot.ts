import type { AnuncioComparavel } from "@/lib/mlComparacaoAnuncios";

export type MetricaSwot = "visitas" | "pedidos" | "conversao" | "receitaVisita";
export type EvidenciaSwot = { metrica: MetricaSwot; valor: number; referencia: number; delta: number };
export function valorSwot(item: AnuncioComparavel, metrica: MetricaSwot): number | null {
  if (metrica !== "visitas" && !item.completo) return null;
  const valor = metrica === "receitaVisita"
    ? item.faturamento != null && item.visitas != null && item.visitas > 0 ? item.faturamento / item.visitas : null
    : item[metrica];
  return valor != null && Number.isFinite(valor) && valor >= 0 ? valor : null;
}
export function compararSwot(item: AnuncioComparavel, itens: AnuncioComparavel[]) {
  const evidencias: EvidenciaSwot[] = [];
  for (const metrica of ["visitas", "pedidos", "conversao", "receitaVisita"] as const) {
    const valor = valorSwot(item, metrica);
    const pares = itens.filter(x => x.id !== item.id).map(x => valorSwot(x, metrica)).filter((x): x is number => x !== null).sort((a, b) => a - b);
    if (valor === null || !pares.length) continue;
    const centro = Math.floor(pares.length / 2);
    const referencia = pares.length % 2 ? pares[centro] : (pares[centro - 1] + pares[centro]) / 2;
    evidencias.push({ metrica, valor, referencia, delta: valor - referencia });
  }
  return {
    evidencias,
    forcas: evidencias.filter(x => x.delta > 0),
    fraquezas: evidencias.filter(x => x.delta < 0),
    revisarConversao: evidencias.some(x => x.metrica === "conversao" && x.delta < 0),
    revisarAlcance: evidencias.some(x => x.metrica === "visitas" && x.delta < 0) && evidencias.some(x => x.metrica === "conversao" && x.delta > 0),
    cancelados: item.completo && item.cancelados != null && Number.isFinite(item.cancelados) && item.cancelados >= 0 ? item.cancelados : null,
  };
}