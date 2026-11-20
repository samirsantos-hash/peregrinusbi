import { describe, expect, it } from 'vitest';
import { amostraCampanhas } from '../../supabase/functions/_shared/mlCampanhasDiagnostico';

describe('diagnóstico limitado de promoções', () => {
  it('consulta no máximo 20 pedidos pagos', () => {
    const pedidos = [{ status: 'cancelled', id: 0 }, ...Array.from({ length: 30 }, (_, i) => ({ status: 'paid', id: i + 1 }))];
    expect(amostraCampanhas(pedidos)).toHaveLength(20);
    expect(amostraCampanhas(pedidos).every(p => p.status === 'paid')).toBe(true);
    expect(amostraCampanhas([{ status: 'cancelled' }])).toEqual([]);
  });
});