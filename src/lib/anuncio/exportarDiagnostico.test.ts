import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { diagnosticar, montarDimensoes, filaDeAcao, lotesDeCorrecao } from './diagnostico';
import { criarExcelDiagnostico } from './exportarDiagnostico';

function exemplo() {
  const d = diagnosticar('MLB123', montarDimensoes({ promocoes: 0.0001 }, 0));
  const lotes = lotesDeCorrecao(filaDeAcao([d], new Map([['MLB123', 12345]])));
  const wb = XLSX.read(criarExcelDiagnostico({ custId: '99', periodo: { inicio: '2026-10-08', fim: '2026-11-06' }, lotes, porMlb: new Map([[d.mlb, d]]), titulos: new Map([[d.mlb, '=HYPERLINK("x")']]) }), { type: 'array' });
  return { wb, d, linhas: XLSX.utils.sheet_to_json(wb.Sheets['Anúncios'], { defval: null }) as Record<string, unknown>[], dimensoes: XLSX.utils.sheet_to_json(wb.Sheets['Dimensões'], { defval: null }) as Record<string, unknown>[] };
}

describe('Excel dos lotes de diagnóstico', () => {
  it('exporta notas e coberturas exatas do diagnóstico, receita em reais e datas da tela', () => {
    const { linhas, d } = exemplo();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]['Construção (0–100)']).toBe(d.construcao.indice);
    expect(linhas[0]['Resposta (0–100)']).toBe(d.resposta.indice);
    expect(linhas[0]['Cobertura Construção']).toBe(d.construcao.cobertura);
    expect(linhas[0]['Cobertura Resposta']).toBe(d.resposta.cobertura);
    expect(linhas[0]['Faturamento (R$)']).toBe(123.45);
    expect(linhas[0]['Início do período']).toBe('2026-10-08');
    expect(linhas[0]['Fim do período']).toBe('2026-11-06');
  });
  it('mantém ausências em branco sem substituir zero medido', () => {
    const { dimensoes } = exemplo();
    expect(dimensoes).toHaveLength(11);
    expect(dimensoes.find(d => d.Dimensão === 'Fotos')?.['Nota (0–100)']).toBeNull();
    expect(dimensoes.find(d => d.Dimensão === 'Promoções')?.['Nota (0–100)']).toBe(0);
  });
  it('preserva os pesos v2 e os cortes vigentes para comparação', () => {
    const { wb, dimensoes } = exemplo();
    expect(dimensoes.filter(d => d.Eixo === 'Construção').reduce((s, d) => s + Number(d.Peso), 0)).toBe(415);
    expect(dimensoes.filter(d => d.Eixo === 'Resposta').reduce((s, d) => s + Number(d.Peso), 0)).toBe(245);
    const criterios = XLSX.utils.sheet_to_json(wb.Sheets['Critérios'], { header: 1 });
    expect(criterios).toContainEqual(['Corte Construção (provisório)', 60]);
    expect(criterios).toContainEqual(['Corte Resposta (provisório)', 50]);
  });
  it('não transforma títulos de anúncio em fórmulas executáveis', () => {
    const { wb, linhas } = exemplo();
    expect(linhas[0].Título).toBe('\'=HYPERLINK("x")');
    expect(wb.Sheets['Anúncios'].F2.f).toBeUndefined();
  });
});