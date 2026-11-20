import { describe, expect, it } from 'vitest';
import { coberturaCampanhas, type DiagnosticoCampanhas } from './campanhasLeitura';

const diagnostico: DiagnosticoCampanhas = {
  periodo: { inicio: '2026-09-28', fim: '2026-10-27' },
  amostra: true, atribuicaoConfirmada: false,
  diagnostico: { consultados: 20, disponiveis: 17, indisponiveis: 3, comCampanha: 7, campanhaReconhecida: 0, ofertaReconhecida: 0 },
};
describe('Cobertura de atribuição promocional', () => {
  it('calcula cobertura de leitura, não participação das promoções', () => {
    expect(coberturaCampanhas(diagnostico).leituras).toBe(.85);
    expect(coberturaCampanhas(diagnostico).correspondencias).toBe(0);
  });
  it('correspondências de amostra nunca autorizam desempenho diário por promoção', () => {
    expect(coberturaCampanhas({ ...diagnostico, diagnostico: { ...diagnostico.diagnostico, campanhaReconhecida: 20, ofertaReconhecida: 20 } }).podeExibirDesempenho).toBe(false);
  });
  it('ausência de pedidos consultados não vira cobertura zero', () => {
    expect(coberturaCampanhas({ ...diagnostico, diagnostico: { ...diagnostico.diagnostico, consultados: 0, disponiveis: 0 } }).leituras).toBeNull();
  });
});