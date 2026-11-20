import { describe, it, expect } from 'vitest';
import { fracaoMedida, variacaoPp, mesesFechados, comparacaoMensal, REFERENCIAS_ESTUDO, type MesReputacao } from '@/lib/estudoReputacao';
const row = (data: string, rate: number | null): MesReputacao => ({ id: data, seller_id: 'loja', data, rep_claims_rate: rate, rep_delayed_ht_rate: null, rep_cancellations_rate: null });
describe('Estudo de reputação', () => {
  it('preserva zero medido e ausência', () => { expect(fracaoMedida(0)).toBe(0); expect(fracaoMedida(null)).toBeNull(); });
  it('não normaliza duas vezes uma fração', () => { expect(variacaoPp(0.0047, 0)).toBeCloseTo(0.47); expect(fracaoMedida(57.14)).toBeNull(); });
  it('mantém 100% como taxa válida sem inferir volume', () => expect(fracaoMedida(1)).toBe(1));
  it('referências do estudo são 2%, 5%, 3%, sem alterar régua oficial', () => expect(REFERENCIAS_ESTUDO.map(r => r.limite)).toEqual([0.02, 0.05, 0.03]));
  it('não usa mês aberto nem dias artificiais', () => expect(mesesFechados([row('2026-10-01', 0), row('2026-11-01', 0)], '2026-11-05').map(r => r.data)).toEqual(['2026-10-01']));
  it('compara apenas meses consecutivos da mesma loja', () => { expect(comparacaoMensal([row('2026-09-01', 0.01), row('2026-10-01', 0.02)], 'rep_claims_rate')).toBe(1); expect(comparacaoMensal([row('2026-08-01', 0), row('2026-10-01', 0.02)], 'rep_claims_rate')).toBeNull(); });
  it('não transforma ausência anterior em estabilidade', () => expect(comparacaoMensal([row('2026-09-01', null), row('2026-10-01', 0)], 'rep_claims_rate')).toBeNull());
});