import { fetchAllRows } from "@/lib/fetchAllRows";

/** Always scope on the server, even for large portfolios; never fall back to all rows. */
export async function fetchScopedRows<T>(
  ids: readonly string[],
  build: (ids: string[], from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const unique = [...new Set(ids)].sort();
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    const { data, error } = await fetchAllRows<T>((from, to) => build(batch, from, to));
    if (error) throw error;
    out.push(...data);
  }
  return out;
}