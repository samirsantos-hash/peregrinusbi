export type DiaCampanha = { dia: string; cost: number | null; total_amount: number | null; clicks: number | null; prints: number | null; units_quantity: number | null };
export type FaturamentoDia = { data: string; faturamento: number };
const valor = (v: number | null | undefined) => v != null && Number.isFinite(v) ? v : null;
const razao = (a: number | null, b: number | null) => a != null && b != null && b > 0 ? a / b : null;

export function serieCampanha(linhas: DiaCampanha[], faturamento: FaturamentoDia[]) {
  const fat = new Map(faturamento.map(d => [d.data.slice(0, 10), valor(d.faturamento)]));
  return [...linhas].sort((a, b) => a.dia.localeCompare(b.dia)).map(l => {
    const investimento = valor(l.cost), vendas = valor(l.total_amount), cliques = valor(l.clicks);
    return { dia: l.dia, investimento, vendas, cliques,
      roas: razao(vendas, investimento), acos: razao(investimento, vendas),
      cpc: razao(investimento, cliques), ctr: razao(cliques, valor(l.prints)),
      tacos: razao(investimento, fat.get(l.dia) ?? null) };
  });
}

/** Campaign contribution to store TACOS; complete, identical calendar dates only. */
export function tacosCampanha(linhas: DiaCampanha[], faturamento: FaturamentoDia[], de: string, ate: string) {
  const custos = new Map(linhas.map(l => [l.dia, valor(l.cost)]));
  const fat = new Map(faturamento.map(l => [l.data.slice(0, 10), valor(l.faturamento)]));
  let investimento = 0, receita = 0;
  if (de > ate) return null;
  for (let dia = de; dia <= ate; dia = new Date(Date.parse(`${dia}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
    const c = custos.get(dia), f = fat.get(dia);
    if (c == null || f == null) return null;
    investimento += c; receita += f;
  }
  return razao(investimento, receita);
}