import type { QueryClient } from '@tanstack/react-query';

/** Intention only: no prediction or background commercial bulk scans. */
export async function anteciparConsulta(client: QueryClient, chave: readonly unknown[]) {
  if (client.isFetching() > 0 || client.isMutating() > 0 || document.visibilityState === 'hidden') return false;
  const query = client.getQueryCache().find({ queryKey: chave, exact: true });
  // Reuse the destination's real options, not a second query/permission implementation.
  if (!query?.options.queryFn || Date.now() - query.state.dataUpdatedAt < 5 * 60_000) return false;
  await client.prefetchQuery({ ...query.options, queryKey: chave, staleTime: 5 * 60_000 });
  return true;
}