import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { IndicadorCarregamento } from '@/components/chuva/IndicadorCarregamento';

afterEach(() => { cleanup(); document.getElementById('root')?.remove(); vi.useRealTimers(); });

it('libera a página somente depois de 100% e da exibição da conclusão', async () => {
  vi.useFakeTimers();
  const root = document.createElement('div');
  root.id = 'root';
  root.inert = false;
  document.body.append(root);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><IndicadorCarregamento /></QueryClientProvider>, { container: root });
  let concluirA: ((valor: number) => void) | undefined;
  let concluirB: ((valor: number) => void) | undefined;
  let a: Promise<number>;
  let b: Promise<number>;
  act(() => {
    a = client.fetchQuery({ queryKey: ['a'], queryFn: () => new Promise<number>(r => { concluirA = r; }) });
    b = client.fetchQuery({ queryKey: ['b'], queryFn: () => new Promise<number>(r => { concluirB = r; }) });
  });
  expect(root.inert).toBe(true);
  expect(root.classList.contains('pagina-aguardando-consultas')).toBe(true);
  await act(async () => { concluirA?.(1); await a; });
  expect(screen.getByText('50%')).toBeTruthy();
  expect(root.inert).toBe(true);
  await act(async () => { concluirB?.(2); await b; });
  expect(screen.getByText('100%')).toBeTruthy();
  expect(root.inert).toBe(true);
  act(() => { vi.advanceTimersByTime(600); });
  expect(root.inert).toBe(false);
  expect(root.classList.contains('pagina-aguardando-consultas')).toBe(false);
  expect(screen.queryByRole('status')).toBeNull();
  act(() => { client.clear(); });
});