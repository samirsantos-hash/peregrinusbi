// Histórico semanal dos termos em alta (/trends). Sem I/O.
// O ML só devolve a semana atual (50 termos, sem volume); o histórico é o que o painel guarda.

/** Quantas categorias mais vendidas de cada conta entram na coleta. */
export const CATEGORIAS_POR_CONTA = 10;
/** Quantos níveis acima a coleta sobe quando a categoria não tem termos. */
export const NIVEIS_ACIMA = 2;
/** Depois disso a categoria é conferida de novo (a árvore do ML muda pouco). */
export const DIAS_MAPA_VALIDO = 30;

/** Segunda-feira da semana em São Paulo (UTC−3, sem horário de verão desde 2019), como AAAA-MM-DD. */
export function semanaDe(agora: Date = new Date()): string {
  const sp = new Date(agora.getTime() - 3 * 3600_000);
  const recuo = (sp.getUTCDay() + 6) % 7;
  sp.setUTCDate(sp.getUTCDate() - recuo);
  return sp.toISOString().slice(0, 10);
}

/** Categorias com mais unidades vendidas entre os anúncios ativos (empate: mais anúncios). */
export function topCategorias(linhas: { categoria_id: string | null; vendidos: number | null }[], n = CATEGORIAS_POR_CONTA): string[] {
  const soma = new Map<string, { vendidos: number; anuncios: number }>();
  for (const l of linhas) {
    if (!l.categoria_id) continue;
    const s = soma.get(l.categoria_id) ?? { vendidos: 0, anuncios: 0 };
    s.vendidos += l.vendidos ?? 0;
    s.anuncios += 1;
    soma.set(l.categoria_id, s);
  }
  return [...soma.entries()]
    .sort((a, b) => b[1].vendidos - a[1].vendidos || b[1].anuncios - a[1].anuncios || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([id]) => id);
}

/** Ordem de tentativa: a própria categoria e até `niveis` acima, pelo path_from_root de /categories/{id}. */
export function cadeiaDeCategorias(categoriaId: string, caminho: { id: string; nome: string }[], niveis = NIVEIS_ACIMA) {
  const ate = caminho.findIndex((c) => c.id === categoriaId);
  const base = ate >= 0 ? caminho.slice(0, ate + 1) : [...caminho, { id: categoriaId, nome: "" }];
  return base.reverse().slice(0, niveis + 1);
}
