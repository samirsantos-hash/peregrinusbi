import { describe, expect, it } from 'vitest';
import { participacoesConfirmadas } from './promocoesParticipacao';

describe('adesões sem atribuição de resultados', () => {
  it('conta adesões distintas e não conta convites', () => {
    const p = participacoesConfirmadas([{ promotion_id: 'p', itens_completo: true, participando: 2 }], [
      { promotion_id: 'p', item_id: 'a', status: 'started' },
      { promotion_id: 'p', item_id: 'a', status: 'active' },
      { promotion_id: 'p', item_id: 'b', status: 'pending' },
      { promotion_id: 'p', item_id: 'c', status: 'candidate' },
    ]);
    expect(p[0].quantidade).toBe(2);
  });
  it('não mostra quantidade total em leitura parcial', () => {
    const p = participacoesConfirmadas([{ promotion_id: 'p', itens_completo: false, participando: 3 }], []);
    expect(p[0].quantidade).toBeNull();
  });
  it('adesão atual nunca fornece ROAS nem ROI', () => {
    const p = participacoesConfirmadas([{ promotion_id: 'p', itens_completo: true, participando: 1 }], [{ promotion_id: 'p', item_id: 'a', status: 'active' }]);
    expect(p[0].roas).toBeNull();
    expect(p[0].roi).toBeNull();
  });
  it('não inclui campanha sem evidência de adesão', () => {
    expect(participacoesConfirmadas([{ promotion_id: 'p', itens_completo: false, participando: null }], [{ promotion_id: 'p', item_id: 'a', status: 'candidate' }])).toEqual([]);
  });
});