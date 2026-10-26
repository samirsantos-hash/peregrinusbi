import { describe, it, expect } from 'vitest';
import { balancearFull, alertasFull, type FullProduto } from './fullBalanceamento';
const produto = (id: string, phase = 0): FullProduto => ({ id, titulo: id, sku: null, link: '', foto: null, estoque: 60, status: 'active', saude: .9, qualidade: null, fotos: [{ largura: 1200, altura: 1200 }], unidades: 30, faturamento: 300, diario: Array.from({ length: 30 }, (_, i) => ({ data: `2026-10-${String(i + 1).padStart(2, '0')}`, faturamento: i % 2 === phase ? 20 : 0 })) });
describe('Full balanceado', () => {
  it('balanceia pesos sem negativos e sem concentrar mais de 40% com 3 produtos', () => {
    const r = balancearFull([produto('A'), produto('B', 1), produto('C')]);
    expect(r).not.toBeNull(); expect(r?.reduce((s, p) => s + p.peso, 0)).toBeCloseTo(1);
    expect(r?.every(p => p.peso >= 0 && p.peso <= .400001)).toBe(true);
  });
  it('não otimiza lacunas ou menos de dois produtos', () => {
    expect(balancearFull([produto('A')])).toBeNull();
    const p = produto('B'); p.diario.pop();
    expect(balancearFull([produto('A'), p])).toBeNull();
  });
  it('sinaliza qualidade e resolução comprovadas sem inferir pelas miniaturas', () => {
    const p = produto('A'); p.saude = .5; p.fotos = [{ largura: 400, altura: 1000 }, { largura: null, altura: null }];
    expect(alertasFull(p)).toContain('Saúde do anúncio abaixo de 70/100');
    expect(alertasFull(p)).toContain('1 foto(s) abaixo de 500 px no menor lado');
    p.fotos = [{ largura: null, altura: null }]; expect(alertasFull(p).some(a => a.includes('px'))).toBe(false);
  });
});