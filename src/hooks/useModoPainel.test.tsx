import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useModoPainel } from './useModoPainel';
describe('alternador por identidade', () => {
  beforeEach(() => localStorage.clear());
  it('restaura o usuário correto quando a sessão muda', () => {
    const h = renderHook(({ id }) => useModoPainel(id), { initialProps: { id: 'samir' } });
    act(() => h.result.current.alternar('avancado'));
    h.rerender({ id: 'outro' });
    expect(h.result.current.modo).toBe('didatico');
    h.rerender({ id: 'samir' });
    expect(h.result.current.modo).toBe('avancado');
  });
  it('permite voltar ao Didático e mantém a escolha na reabertura', () => {
    const h = renderHook(() => useModoPainel('samir'));
    act(() => h.result.current.alternar('avancado'));
    act(() => h.result.current.alternar('didatico'));
    h.unmount();
    expect(renderHook(() => useModoPainel('samir')).result.current.didatico).toBe(true);
  });
});