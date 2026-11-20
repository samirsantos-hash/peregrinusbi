import { describe, expect, it } from 'vitest';
import { funilDiarioResumo, receitaPorVisita } from '@/lib/funilDiarioResumo';
describe('funil diário medido', () => {
  it('compara cada data com 30 dias antes, não pela posição', () => {
    const [d] = funilDiarioResumo([{data:'2026-11-05',visitas:120,pedidos:12}], [{data:'2026-10-07',visitas:999,pedidos:1},{data:'2026-10-06',visitas:100,pedidos:5}]);
    expect(d?.conversao).toBe(10); expect(d?.deltaVisitas).toBeCloseTo(20); expect(d?.deltaConversao).toBe(5);
  });
  it('preserva visitas ausentes e conversão não medida', () => {
    const [d] = funilDiarioResumo([{data:'2026-11-05',pedidos:12}], []);
    expect(d?.visitas).toBeNull(); expect(d?.conversao).toBeNull(); expect(d?.deltaVisitas).toBeNull();
  });
  it('zero visitas medido não vira conversão nem base de variação', () => {
    const [d] = funilDiarioResumo([{data:'2026-11-05',visitas:0,pedidos:0}], [{data:'2026-10-06',visitas:0,pedidos:0}]);
    expect(d?.visitas).toBe(0);expect(d?.conversao).toBeNull();expect(d?.deltaVisitas).toBeNull();expect(d?.deltaConversao).toBeNull();
  });
  it('receita por visita usa totais do mesmo período e não estima ausência', () => {
    expect(receitaPorVisita(1200,100)).toBe(12); expect(receitaPorVisita(1200,null)).toBeNull();expect(receitaPorVisita(1200,0)).toBeNull();
  });
});