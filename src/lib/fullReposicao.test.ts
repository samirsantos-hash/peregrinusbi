import { describe, it, expect } from 'vitest';
import { planejarReposicao } from './fullReposicao';
describe('Reposição Full', () => {
  it('calcula cenários de 7, 10 e 15 dias descontando o estoque', () => {
    expect(planejarReposicao(60, 30, 5)?.cenarios).toEqual([{ dias: 7, unidades: 9 }, { dias: 10, unidades: 15 }, { dias: 15, unidades: 25 }]);
  });
  it('sem oscilação, recomenda 28 dias de vendas e marca ruptura abaixo de 15 dias de cobertura', () => {
    expect(planejarReposicao(60, 30, 20, [10, 10, 10])).toMatchObject({ cobertura: 10, recomendado: 56, envio: 36, risco: true });
    expect(planejarReposicao(60, 30, 40, [10, 10, 10])).toMatchObject({ cobertura: 20, risco: false });
  });
  it('soma estoque de segurança quando a demanda oscila', () => {
    expect(planejarReposicao(60, 30, 0, [0, 20, 0, 20])!.recomendado).toBeGreaterThan(56);
  });
  it('não transforma estoque ausente em zero nem prevê ruptura sem vendas', () => {
    expect(planejarReposicao(30, 30, null)).toBeNull();
    expect(planejarReposicao(0, 30, 5)).toMatchObject({ cobertura: null, risco: false, envio: 0 });
  });
});
