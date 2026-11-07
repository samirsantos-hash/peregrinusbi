import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useConstrucaoAnuncios } from './useConstrucaoAnuncios';
const chamar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/mlFuncoes', () => ({ chamarFuncaoMl: chamar }));
afterEach(() => { cleanup(); chamar.mockReset(); });

it('percorre todos os anúncios em lotes sequenciais de até 20', async () => {
  let ativos = 0, pico = 0;
  chamar.mockImplementation(async (_: string, body: { item_ids: string[] }) => {
    ativos++; pico = Math.max(pico, ativos);
    await new Promise(r => setTimeout(r, 5));
    ativos--;
    return { itens: body.item_ids.map(item_id => ({ item_id })), indisponiveis: [], coberturaCompleta: true, consultadoEm: '' };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ids = Array.from({ length: 41 }, (_, i) => `MLB${10000 + i}`);
  const { result } = renderHook(() => useConstrucaoAnuncios('123', ids), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
  await waitFor(() => expect(result.current.completo).toBe(true));
  expect(result.current.lidos).toBe(41);
  expect(pico).toBe(1);
  expect(chamar.mock.calls.map(c => c[1].item_ids.length)).toEqual([20, 20, 1]);
  act(() => { client.clear(); });
});