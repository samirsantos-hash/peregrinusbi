import { describe, it, expect } from 'vitest';
import { respostaLenta, devePersistir } from '@/lib/cachePainel';
describe('cache e lentidão', () => {
  it('alerta só acima de 1 segundo', () => { expect(respostaLenta(1000)).toBe(false); expect(respostaLenta(1001)).toBe(true); });
  it('nunca guarda permissões', () => {
    expect(devePersistir({ queryKey: ['minhas-permissoes'], state: { status: 'success' } } as never)).toBe(false);
    expect(devePersistir({ queryKey: ['kpis'], state: { status: 'success' } } as never)).toBe(true);
  });
});
