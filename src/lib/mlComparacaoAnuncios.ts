export interface AnuncioComparavel {
  id: string; titulo: string; tipo: string | null; preco: number; link: string;
  visitas: number | null; cliques: number | null; pedidos: number | null;
  unidades: number | null; faturamento: number | null; cancelados: number | null;
  conversao: number | null; promocao: boolean | null; completo: boolean;
}
export type MetricaAnuncio = "visitas" | "pedidos" | "conversao";
export function ordenarAnuncios(itens: AnuncioComparavel[], metrica: MetricaAnuncio) {
  return [...itens].sort((a, b) => {
    const av = a[metrica], bv = b[metrica];
    if (av == null) return bv == null ? a.id.localeCompare(b.id) : 1;
    if (bv == null) return -1;
    return bv - av || a.id.localeCompare(b.id);
  });
}