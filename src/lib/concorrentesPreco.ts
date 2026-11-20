export interface OfertaConcorrente {
  id: string;
  produtoId: string;
  titulo: string;
  preco: number | null;
  precoOriginal: number | null;
  vendedor: string | null;
  full: boolean;
  freteGratis: boolean;
  visitas: null;
  conversao: null;
  link: string;
}

const precoValido = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/** Only confirmed offer fields; third-party visits and paid-order coverage are unverified. */
export function normalizarOfertas(valor: unknown): OfertaConcorrente[] {
  if (!Array.isArray(valor)) return [];
  const vistas = new Set<string>();
  return valor.flatMap((linha) => {
    if (!linha || typeof linha !== "object") return [];
    const r = linha as Record<string, unknown>;
    if (typeof r.id !== "string" || !/^MLB\d+$/.test(r.id) ||
        typeof r.produto_id !== "string" || !/^MLB\d+$/.test(r.produto_id)) return [];
    const chave = `${r.produto_id}:${r.id}`;
    if (vistas.has(chave)) return [];
    vistas.add(chave);
    return [{
      id: r.id, produtoId: r.produto_id,
      titulo: typeof r.titulo === "string" ? r.titulo : r.produto_id,
      preco: precoValido(r.preco), precoOriginal: precoValido(r.preco_original),
      vendedor: typeof r.vendedor === "string" ? r.vendedor : null,
      full: r.full === true, freteGratis: r.frete_gratis === true,
      visitas: null, conversao: null,
      link: `https://produto.mercadolivre.com.br/${r.id.replace(/^MLB/, "MLB-")}`,
    }];
  });
}

/** Compare offers for one exact catalog product, never mixed search results. */
export function resumoPrecos(itens: OfertaConcorrente[], produtoId: string) {
  const precos = itens.filter((i) => i.produtoId === produtoId)
    .flatMap((i) => i.preco === null ? [] : [i.preco]).sort((a, b) => a - b);
  const minimo = precos[0];
  const maximo = precos[precos.length - 1];
  if (minimo === undefined || maximo === undefined) return null;
  const meio = Math.floor(precos.length / 2);
  const central = precos[meio];
  if (central === undefined) return null;
  return { minimo, maximo, mediana: precos.length % 2 ? central : ((precos[meio - 1] ?? central) + central) / 2, total: precos.length };
}

export function lerPrecoInformado(texto: string): number | null {
  const valor = texto.trim().replace(/\s|R\$/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(valor)) return null;
  return precoValido(Number(valor.replace(/\./g, "").replace(",", ".")));
}