export type AnuncioCatalogo = { itemId: string; status: string | null; estoque: number | null; preco: number | null };
export type ResumoCatalogo = { estoqueZerado: number; pausadosComVenda: number; pausadosSemVenda: number; perdaDia: number | null };
const dig = (s: string) => String(s).replace(/\D/g, "");

/** vendas7d: unidades pagas por anúncio nos últimos 7 dias; null = sem medição (perda e divisão por venda ficam nulas). */
export function resumirCatalogo(anuncios: AnuncioCatalogo[], vendas7d: Map<string, number> | null): ResumoCatalogo & { pausadosSemMedicao: boolean } {
  let estoqueZerado = 0, comVenda = 0, semVenda = 0, perda = 0;
  for (const a of anuncios) {
    const pausado = a.status === "paused";
    const zerado = a.status === "active" && a.estoque === 0 || (pausado && a.estoque === 0);
    if (a.status === "active" && a.estoque === 0) estoqueZerado++;
    const un = vendas7d?.get(dig(a.itemId)) ?? 0;
    if (pausado) un > 0 ? comVenda++ : semVenda++;
    if ((zerado || pausado) && un > 0 && a.preco != null) perda += (un * a.preco) / 7;
  }
  return { estoqueZerado, pausadosComVenda: vendas7d ? comVenda : 0, pausadosSemVenda: vendas7d ? semVenda : comVenda + semVenda,
    perdaDia: vendas7d ? perda : null, pausadosSemMedicao: !vendas7d };
}
