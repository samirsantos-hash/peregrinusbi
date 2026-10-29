import { describe, expect, it } from 'vitest';
import { capitalPaulista, mesAnterior, resumoFlex } from '@/lib/flexDesempenho';

const lojas = [{ id: 'c', nickname: 'Carrera', custId: '1' }, { id: 'n', nickname: 'Nova', custId: '2' }, { id: 'g', nickname: 'Granleste', custId: '3' }];
const dados = [
  { seller_id: 'c', tim_month_id: 202609, tgmv_lc: 132060.78, tgmv_lc_flex: 7692.17, tsi_flex: 73 },
  { seller_id: 'n', tim_month_id: 202609, tgmv_lc: 44835.14, tgmv_lc_flex: 709.78, tsi_flex: 5 },
  { seller_id: 'g', tim_month_id: 202609, tgmv_lc: 3759.12, tgmv_lc_flex: 0, tsi_flex: 0 },
];
describe('desempenho Flex por loja', () => {
  it('usa município confirmado, nunca apenas estado ou Grande São Paulo', () => {
    expect(capitalPaulista('São Paulo', 'SP')).toBe(true);
    expect(capitalPaulista(null, 'SP')).toBe(false);
    expect(capitalPaulista('São Caetano do Sul', 'SP')).toBe(false);
  });
  it('soma faturamento e unidades Flex e pondera a participação pelos totais', () => {
    const r = resumoFlex(lojas, dados, 202609);
    expect(r.faturamento.valor).toBeCloseTo(8401.95, 2);
    expect(r.unidades.valor).toBe(78);
    expect(r.participacao).toBeCloseTo(4.6508, 4);
    expect(r.linhas[0].faturamento).toBe(7692.17);
  });
  it('distingue vendas zero de loja sem medição e bloqueia comparação parcial', () => {
    const r = resumoFlex([...lojas, { id: 'a', nickname: 'Accioly', custId: '4' }], dados, 202609);
    expect(r.linhas.find(l => l.id === 'g')?.faturamento).toBe(0);
    expect(r.linhas.find(l => l.id === 'a')?.faturamento).toBeNull();
    expect(r.faturamento.cobertura).toBe(3);
    expect(r.participacao).toBeNull();
    expect(r.variacaoFaturamento).toBeNull();
  });
  it('compara as mesmas lojas no mês anterior e cruza a virada do ano', () => {
    const anterior = dados.map(d => ({ ...d, tim_month_id: 202608, tgmv_lc_flex: (d.tgmv_lc_flex ?? 0) / 2, tsi_flex: (d.tsi_flex ?? 0) / 2 }));
    const r = resumoFlex(lojas, [...dados, ...anterior], 202609);
    expect(r.variacaoFaturamento).toBeCloseTo(100);
    expect(r.variacaoUnidades).toBeCloseTo(100);
    expect(mesAnterior(202601)).toBe(202512);
  });
  it('preserva campo desconhecido mesmo com outro indicador disponível', () => {
    const r = resumoFlex([lojas[0]], [{ ...dados[0], tsi_flex: null }], 202609);
    expect(r.faturamento.valor).toBe(7692.17);
    expect(r.unidades.valor).toBeNull();
  });
});
import { serieFlexLoja } from '@/lib/flexDesempenho';
describe('serieFlexLoja', () => {
  it('compara Flex com total e calcula crescimento sem inventar meses', () => {
    const d = [
      { seller_id: 'a', tim_month_id: 202608, tgmv_lc: 1000, tgmv_lc_flex: 100, tsi_flex: 1 },
      { seller_id: 'a', tim_month_id: 202609, tgmv_lc: 1000, tgmv_lc_flex: 150, tsi_flex: 1 },
    ];
    const [ago, set, out] = serieFlexLoja(d, 'a', [202608, 202609, 202610]);
    expect(ago.crescimento).toBeNull();
    expect(set).toMatchObject({ flex: 150, outras: 850, participacao: 15, crescimento: 50 });
    expect(out.flex).toBeNull();
  });
});
