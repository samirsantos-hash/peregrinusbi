import { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { anteciparConsulta } from '@/lib/cacheAntecipacao';

it('não antecipa sem consulta real nem durante carregamento da tela atual', async () => {
  const client = new QueryClient();
  expect(await anteciparConsulta(client, ['ml-curva-abc', 'loja', 30])).toBe(false);
  vi.spyOn(client, 'isFetching').mockReturnValue(1);
  const fn = vi.fn(async () => 1);
  client.getQueryCache().build(client, { queryKey: ['ml-curva-abc', 'loja', 30], queryFn: fn });
  expect(await anteciparConsulta(client, ['ml-curva-abc', 'loja', 30])).toBe(false);
  expect(fn).not.toHaveBeenCalled();
  client.clear();
});