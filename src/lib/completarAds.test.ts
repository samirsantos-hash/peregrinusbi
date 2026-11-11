import { describe, expect, it } from 'vitest';
import { precisaCompletar } from './completarAds';
describe('precisaCompletar', () => {
  it('dado até ontem está em dia', () => expect(precisaCompletar('2026-11-10', '2026-11-11')).toBe(false));
  it('dado atrasado precisa completar', () => expect(precisaCompletar('2026-11-04', '2026-11-11')).toBe(true));
  it('sem dado precisa completar', () => expect(precisaCompletar(null, '2026-11-11')).toBe(true));
});
