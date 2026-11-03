import { describe, expect, it } from 'vitest';
import { janelaMensal, projetarCancelamentosMensais } from '../../supabase/functions/ml-analise-loja/cancelamentosMensais';
import { compararCancelamentos, mesesDoPeriodo, mesAnterior, type CancelamentoMensal } from '@/lib/cancelamentosMensais';
const order = (id: number, status: string, amount: unknown, date = '2026-10-01') => ({ id, status, total_amount: amount, date_created: date, currency_id: 'BRL' });
describe('Cancelamentos reais por mês', () => {
  it('soma valores reais dos cancelados sem inferir do faturamento nem duplicar', () => {
    const cancelado = order(2, 'cancelled', 25);
    const r = projetarCancelamentosMensais([order(1, 'paid', 100), cancelado, cancelado, order(3, 'pending', 999)], '2026-10-01', '2026-10-31');
    expect(r.valorCancelado).toBe(25); expect(r.cancelados).toBe(1); expect(r.faturamento).toBe(100); expect(r.proporcao).toBe(.25);
  });
  it('zero cancelado comprovado tem 0% mesmo com faturamento constante', () => {
    const r = projetarCancelamentosMensais([order(1, 'paid', 100), order(2, 'paid', 100, '2026-10-02')], '2026-10-01', '2026-10-02');
    expect(r.valorCancelado).toBe(0); expect(r.proporcao).toBe(0); expect(r.valoresCompletos).toBe(true);
  });
  it('sem faturamento mantém valor cancelado real e não divide por zero', () => {
    const r = projetarCancelamentosMensais([order(1, 'cancelled', 50)], '2026-10-01', '2026-10-31');
    expect(r.valorCancelado).toBe(50); expect(r.faturamento).toBe(0); expect(r.proporcao).toBeNull();
  });
  it.each([null, undefined, '', 'inválido', -1])('valor cancelado ausente ou inválido %s não vira zero', amount => {
    const r = projetarCancelamentosMensais([order(1, 'cancelled', amount), order(2, 'paid', 100)], '2026-10-01', '2026-10-31');
    expect(r.valorCancelado).toBeNull(); expect(r.cancelados).toBe(1); expect(r.proporcao).toBeNull();
  });
  it('não converte moeda desconhecida em reais', () => {
    const r = projetarCancelamentosMensais([{ ...order(1, 'cancelled', 25), currency_id: 'USD' }], '2026-10-01', '2026-10-31');
    expect(r.valorCancelado).toBeNull();
  });
  it('mês atual termina ontem e mês fechado inclui todos seus dias', () => {
    const agora = new Date('2026-11-03T18:29:00Z');
    expect(janelaMensal('2026-11', agora)).toEqual({ mes: '2026-11', inicio: '2026-11-01', fim: '2026-11-02', parcial: true });
    expect(janelaMensal('2026-10', agora)).toEqual({ mes: '2026-10', inicio: '2026-10-01', fim: '2026-10-31', parcial: false });
    expect(() => janelaMensal('2026-12', agora)).toThrow(); expect(() => janelaMensal('2026-13', agora)).toThrow();
  });
  it('rejeita pedido fora do mês em vez de fechar cobertura incorreta', () => {
    expect(() => projetarCancelamentosMensais([order(1, 'cancelled', 25, '2026-09-30')], '2026-10-01', '2026-10-31')).toThrow();
  });
  it('compara mês parcial apenas aos mesmos dias do mês anterior', () => {
    const atual = { periodo: janelaMensal('2026-11', new Date('2026-11-03')), ...projetarCancelamentosMensais([order(1, 'cancelled', 30, '2026-11-01')], '2026-11-01', '2026-11-02'), coberturaCompleta: true } satisfies CancelamentoMensal;
    const anterior = { periodo: janelaMensal('2026-10', new Date('2026-11-03')), ...projetarCancelamentosMensais([order(2, 'cancelled', 20), order(3, 'cancelled', 100, '2026-10-03')], '2026-10-01', '2026-10-31'), coberturaCompleta: true } satisfies CancelamentoMensal;
    expect(compararCancelamentos(atual, anterior)).toEqual({ valorAnterior: 20, variacao: .5, dias: 2 });
    expect(compararCancelamentos(atual, { ...anterior, coberturaCompleta: false })).toBeNull();
  });
  it('lista somente os meses do período e trata virada de ano', () => {
    expect(mesesDoPeriodo('2026-09-15', '2026-11-02', new Date('2026-11-03'))).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(mesAnterior('2026-01')).toBe('2025-12');
  });
});