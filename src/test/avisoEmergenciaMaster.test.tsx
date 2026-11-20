import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SaidaEmergencia from '@/components/SaidaEmergencia';
import { EVENTO } from '@/lib/saidaEmergencia';

const perfil = vi.hoisted(() => ({ master: false }));
vi.mock('@/hooks/usePermissoes', () => ({ usePermissoes: () => perfil }));
afterEach(cleanup);

describe('aviso de emergência exclusivo de master', () => {
  it.each([true, false])('master=%s mantém proteção e restringe aviso', (master) => {
    perfil.master = master;
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><SaidaEmergencia /></QueryClientProvider>);
    act(() => { window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ativa: true } })); });
    expect(Boolean(screen.queryByRole('status'))).toBe(master);
    expect(client.getDefaultOptions().queries?.refetchInterval).toBe(false);
    act(() => { window.dispatchEvent(new CustomEvent(EVENTO, { detail: { ativa: false } })); });
    expect(screen.queryByRole('status')).toBeNull();
  });
});