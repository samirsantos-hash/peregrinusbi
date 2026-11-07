import { describe, it, expect } from 'vitest';
import { mixEnvios, modalDoEnvio } from '../../supabase/functions/ml-sync-loja/envios';

const pedido = (id: number) => ({ status: 'paid', seller: { id: 42 }, shipping: { id }, total_amount: 100, currency_id: 'BRL' });
describe('Modal real de envio', () => {
  it.each(['cross_docking', 'xd_drop_off', 'drop_off', 'fulfillment', 'self_service', 'xd_same_day'])('preserva o tipo real %s', (type) => {
    expect(modalDoEnvio({ origin: { sender_id: 42 }, logistic: { type } }, '42')).toBe(type);
  });
  it('não inventa DX/ME2 nem usa anúncio como prova', () => {
    expect(modalDoEnvio({ origin: { sender_id: 42 }, shipping: { logistic_type: 'cross_docking', mode: 'me2' } }, '42')).toBe('sem_info');
  });
  it('rejeita envio de outra loja e tipo desconhecido', () => {
    expect(modalDoEnvio({ origin: { sender_id: 43 }, logistic: { type: 'cross_docking' } }, '42')).toBe('sem_info');
    expect(modalDoEnvio({ origin: { sender_id: 42 }, logistic: { type: 'novo' } }, '42')).toBe('sem_info');
  });
  it('conta pedidos separadamente e consulta pacote compartilhado uma vez', async () => {
    let chamadas = 0;
    const r = await mixEnvios([pedido(1), pedido(1)], '42', async () => { chamadas++; return { origin: { sender_id: 42 }, logistic: { type: 'xd_drop_off' } }; }, 100, () => 0);
    expect(chamadas).toBe(1);
    expect(r.mix.xd_drop_off).toEqual({ pedidos: 2, faturamento: 200 });
    expect(r.cobertura.identificados).toBe(2);
  });
  it('mantém falhas, prazo vencido e ausência sem classificação', async () => {
    const r = await mixEnvios([pedido(1), { ...pedido(2), shipping: {} }], '42', async () => { throw Error('falha'); }, 100, () => 0);
    expect(r.mix.sem_info.pedidos).toBe(2);
    expect(r.cobertura.completa).toBe(false);
    const vencido = await mixEnvios([pedido(1)], '42', async () => { throw Error('não consultar'); }, 0, () => 1);
    expect(vencido.cobertura.consultas).toBe(0);
  });
  it('exclui cancelados e não pagos', async () => {
    const r = await mixEnvios([{ ...pedido(1), status: 'cancelled' }, { ...pedido(2), status: 'confirmed' }], '42', async () => ({}), 100, () => 0);
    expect(r.cobertura.pedidos).toBe(0);
  });
  it('recusa valores e vendedor não confirmados', async () => {
    await expect(mixEnvios([{ ...pedido(1), seller: { id: 43 } }], '42', async () => ({}), 100)).rejects.toThrow();
    await expect(mixEnvios([{ ...pedido(1), total_amount: NaN }], '42', async () => ({}), 100)).rejects.toThrow();
  });
});