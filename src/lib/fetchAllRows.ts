/**
 * Busca todas as linhas de uma consulta, página a página.
 * O servidor devolve no máximo 1000 linhas por consulta; sem paginação,
 * lojas além da 1000ª (ex.: apelidos que começam com "W") sumiam das buscas.
 * A consulta deve ter ordenação estável (ex.: .order("nickname").order("id")).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: (from: number, to: number) => PromiseLike<{ data: any; error: any }>,
  pageSize = 1000,
): Promise<{ data: T[]; error: any }> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: out, error };
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: out, error: null };
}
