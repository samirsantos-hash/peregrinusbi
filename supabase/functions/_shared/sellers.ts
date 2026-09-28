/**
 * Carrega TODOS os sellers (id, cust_id) paginando.
 * O PostgREST limita cada select a 1000 linhas; sem paginação, sellers além
 * do 1000º eram descartados silenciosamente nas importações.
 */
// deno-lint-ignore no-explicit-any
export async function fetchAllSellers(supabase: any): Promise<{ id: string; cust_id: string }[]> {
  const PAGE = 1000;
  const out: { id: string; cust_id: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sellers")
      .select("id, cust_id")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Seller fetch error: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}
