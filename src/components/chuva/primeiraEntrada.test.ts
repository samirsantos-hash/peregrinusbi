import { describe, expect, it, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  return import('./primeiraEntrada');
}

describe('boas-vindas somente na primeira entrada', () => {
  it('exibe uma vez e não repete após novo login ou recarregamento', async () => {
    localStorage.clear();
    const first = await freshModule();
    expect(first.consumirPrimeiraEntrada('usuario-a')).toBe(true);
    expect(first.consumirPrimeiraEntrada('usuario-a')).toBe(false);
    const reload = await freshModule();
    expect(reload.consumirPrimeiraEntrada('usuario-a')).toBe(false);
  });

  it('cada usuário tem sua própria primeira entrada', async () => {
    localStorage.clear();
    const { consumirPrimeiraEntrada } = await freshModule();
    expect(consumirPrimeiraEntrada('usuario-a')).toBe(true);
    expect(consumirPrimeiraEntrada('usuario-b')).toBe(true);
    expect(consumirPrimeiraEntrada('usuario-a')).toBe(false);
  });

  it('não interrompe o painel com armazenamento bloqueado', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      const { consumirPrimeiraEntrada } = await freshModule();
      expect(consumirPrimeiraEntrada('usuario-c')).toBe(true);
      expect(consumirPrimeiraEntrada('usuario-c')).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});