import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNumeroAnimado } from './useNumeroAnimado';
import { definirCarregamentoApresentacao } from '@/components/chuva/estadoApresentacao';

afterEach(() => { cleanup(); definirCarregamentoApresentacao(false); vi.unstubAllGlobals(); });

it('só inicia a contagem quando a página é liberada e termina no valor real', () => {
  const quadros: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { quadros.push(fn); return quadros.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  definirCarregamentoApresentacao(true);
  const { result } = renderHook(() => useNumeroAnimado('R$ 1.000,00'));
  expect(quadros.length).toBe(0);
  act(() => { definirCarregamentoApresentacao(false); });
  expect(quadros.length).toBe(1);
  const inicio = performance.now();
  act(() => { quadros.shift()?.(inicio + 200); });
  expect(result.current).not.toBe('R$ 1.000,00');
  act(() => { quadros.shift()?.(inicio + 1000); });
  expect(result.current).toBe('R$ 1.000,00');
});