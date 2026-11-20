export type BaseAbc = 'faturamento' | 'unidades';
export type ClasseAbc = 'A' | 'B' | 'C';
export interface ItemVendas { mlb: string; titulo: string; sku: string | null; unidades: number; faturamentoCents: number; pedidos: number; ultimaVenda: string | null; status: string | null }
export const CORTES_PADRAO = { a: 0.8, b: 0.95 };
export function classificarAbc(itens: ItemVendas[], base: BaseAbc, cortes = CORTES_PADRAO) {
  if (!Number.isFinite(cortes.a) || !Number.isFinite(cortes.b) || cortes.a <= 0 || cortes.a >= cortes.b || cortes.b >= 1) throw new Error('Use cortes 0 < A < B < 100%.');
  const ids = new Set<string>();
  for (const i of itens) {
    if (ids.has(i.mlb) || !Number.isSafeInteger(i.unidades) || i.unidades < 0 || !Number.isSafeInteger(i.faturamentoCents) || i.faturamentoCents < 0) throw new Error('Itens ou valores inválidos.');
    ids.add(i.mlb);
  }
  const valor = (i: ItemVendas) => base === 'faturamento' ? i.faturamentoCents : i.unidades;
  const ordenados = itens.filter(i => valor(i) > 0).sort((a, b) => valor(b) - valor(a) || a.mlb.localeCompare(b.mlb));
  const totalBase = ordenados.reduce((s, i) => s + valor(i), 0);
  if (!Number.isSafeInteger(totalBase)) throw new Error('Total fora do limite de precisão.');
  let soma = 0, anteriorValor: number | null = null, classe: ClasseAbc = 'A';
  const classificados = ordenados.map((i, idx) => {
    const v = valor(i);
    if (v !== anteriorValor) classe = soma < totalBase * cortes.a ? 'A' : soma < totalBase * cortes.b ? 'B' : 'C';
    soma += v; anteriorValor = v;
    return { ...i, valorBase: v, classe, participacao: v / totalBase, acumulado: soma / totalBase, posicao: idx + 1 };
  });
  const resumo = (['A', 'B', 'C'] as const).map(classe => {
    const grupo = classificados.filter(i => i.classe === classe), valor = grupo.reduce((s, i) => s + i.valorBase, 0);
    return { classe, itens: grupo.length, valor, participacaoValor: totalBase > 0 ? valor / totalBase : 0 };
  });
  return { base, itens: classificados, resumo, totalBase, semMovimento: itens.filter(i => valor(i) === 0) };
}
export function cruzarAbc(f: ReturnType<typeof classificarAbc>, u: ReturnType<typeof classificarAbc>) {
  const fm = new Map(f.itens.map(i => [i.mlb, i.classe])), um = new Map(u.itens.map(i => [i.mlb, i.classe]));
  const todos = new Map([...f.itens, ...f.semMovimento, ...u.itens, ...u.semMovimento].map(i => [i.mlb, i]));
  return [...todos.values()].map(i => {
    const cf = fm.get(i.mlb) ?? null, cu = um.get(i.mlb) ?? null;
    const perfil = !cf || !cu ? 'Sem movimento em uma base' : cf === 'A' && cu === 'A' ? 'Carro-chefe' : cf === 'A' ? 'Alto valor' : cu === 'A' ? 'Alto giro' : cf === 'C' && cu === 'C' ? 'Cauda longa' : 'Intermediário';
    return { ...i, classeFaturamento: cf, classeUnidades: cu, perfil };
  });
}