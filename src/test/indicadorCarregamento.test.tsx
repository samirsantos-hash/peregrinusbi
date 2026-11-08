import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { IndicadorCarregamento } from '@/components/chuva/IndicadorCarregamento';
import { sinalizarSelecaoCarregamento } from '@/components/chuva/selecaoCarregamento';

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
  const pararA = new QueryObserver(client, { queryKey: ['a'], enabled: false }).subscribe(() => {});
  const pararB = new QueryObserver(client, { queryKey: ['b'], enabled: false }).subscribe(() => {});
  act(() => {
    a = client.fetchQuery({ queryKey: ['a'], queryFn: () => new Promise<number>(r => { concluirA = r; }) });
    b = client.fetchQuery({ queryKey: ['b'], queryFn: () => new Promise<number>(r => { concluirB = r; }) });
  });
  expect(root.inert).toBe(true);
  expect(root.classList.contains('pagina-aguardando-consultas')).toBe(true);
  await act(async () => { concluirA?.(1); await a; });
  expect(screen.getByRole('status', { name: 'Carregando painel' })).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(root.inert).toBe(true);
  await act(async () => { concluirB?.(2); await b; });
  expect(screen.getByRole('status', { name: 'Carregando painel' })).toBeTruthy();
  expect(root.inert).toBe(true);
  act(() => { vi.advanceTimersByTime(600); });
  expect(root.inert).toBe(false);
  expect(root.classList.contains('pagina-aguardando-consultas')).toBe(false);
  expect(screen.queryByRole('status')).toBeNull();
  pararA(); pararB();
  act(() => { client.clear(); });
});

it('mostra a cópia e atualiza sem esconder nem bloquear a página', async () => {
  const root = document.createElement('div'); root.id = 'root'; root.inert = false; document.body.append(root);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['ml-curva-abc', 'loja-1', 30], { total: 10 });
  const parar = new QueryObserver(client, { queryKey: ['ml-curva-abc', 'loja-1', 30], enabled: false }).subscribe(() => {});
  render(<QueryClientProvider client={client}><IndicadorCarregamento /></QueryClientProvider>, { container: root });
  let resolver: ((v: { total: number }) => void) | undefined;
  let pedido: Promise<{ total: number }>;
  act(() => { sinalizarSelecaoCarregamento(); });
  act(() => { pedido = client.fetchQuery({ queryKey: ['ml-curva-abc', 'loja-1', 30], queryFn: () => new Promise(r => { resolver = r; }) }); });
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  expect(root.inert).toBe(false);
  expect(root.classList.contains('pagina-aguardando-consultas')).toBe(false);
  expect(client.getQueryData(['ml-curva-abc', 'loja-1', 30])).toEqual({ total: 10 });
  await act(async () => { resolver?.({ total: 12 }); await pedido; });
  expect(client.getQueryData(['ml-curva-abc', 'loja-1', 30])).toEqual({ total: 12 });
  act(() => { parar(); client.clear(); });
});

it('antecipação sem observador não bloqueia a página', async () => {
  const root = document.createElement('div'); root.id = 'root'; root.inert = false; document.body.append(root);
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><IndicadorCarregamento /></QueryClientProvider>, { container: root });
  let resolver: ((v: number) => void) | undefined;
  let pedido: Promise<number>;
  act(() => { pedido = client.fetchQuery({ queryKey: ['prefetch'], queryFn: () => new Promise(r => { resolver = r; }) }); });
  expect(root.inert).toBe(false);
  await act(async () => { resolver?.(1); await pedido; });
  act(() => { client.clear(); });
});

it('troca de loja ou período mede 50%, tempo real e mantém bloqueio até a conclusão', async () => {
  vi.useFakeTimers();
  const root = document.createElement('div'); root.id = 'root'; root.inert = false; document.body.append(root);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><IndicadorCarregamento /></QueryClientProvider>, { container: root });
  const pararA = new QueryObserver(client, { queryKey: ['loja-2', 7], enabled: false }).subscribe(() => {});
  const pararB = new QueryObserver(client, { queryKey: ['loja-2-anterior', 7], enabled: false }).subscribe(() => {});
  let resolverA: ((v: number) => void) | undefined;
  let resolverB: ((v: number) => void) | undefined;
  let a: Promise<number> = Promise.resolve(0), b: Promise<number> = Promise.resolve(0);
  act(() => {
    sinalizarSelecaoCarregamento();
    a = client.fetchQuery({ queryKey: ['loja-2', 7], queryFn: () => new Promise(r => { resolverA = r; }) });
    b = client.fetchQuery({ queryKey: ['loja-2-anterior', 7], queryFn: () => new Promise(r => { resolverB = r; }) });
    vi.advanceTimersByTime(2000);
  });
  expect(root.inert).toBe(true);
  expect(screen.getByText(/2s decorridos/)).toBeTruthy();
  await act(async () => { resolverA?.(1); await a; });
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  await act(async () => { resolverB?.(2); await b; });
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  expect(root.inert).toBe(true);
  act(() => { vi.advanceTimersByTime(600); });
  expect(root.inert).toBe(false);
  act(() => { pararA(); pararB(); client.clear(); });
});