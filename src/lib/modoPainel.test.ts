import { beforeEach, describe, expect, it } from 'vitest';
import { lerModoPainel, salvarModoPainel } from './modoPainel';
describe('preferência dos dois modos', () => {
  beforeEach(() => localStorage.clear());
  it('começa no modo didático', () => { expect(lerModoPainel('samir')).toBe('didatico'); });
  it('persiste a escolha por usuário, não por loja', () => {
    salvarModoPainel('samir', 'avancado');
    expect(lerModoPainel('samir')).toBe('avancado');
    expect(lerModoPainel('outro')).toBe('didatico');
  });
  it('não cria preferência compartilhada sem identidade', () => {
    salvarModoPainel(undefined, 'avancado');
    expect(localStorage.length).toBe(0);
    expect(lerModoPainel(undefined)).toBe('didatico');
  });
});