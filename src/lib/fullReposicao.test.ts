import { describe, it, expect } from 'vitest';
import { planejarReposicao } from './fullReposicao';
describe('Reposição Full', () => {
  it('calcula cenários distintos de 7, 10 e 15 dias descontando o estoque', () => {
    expect(planejarReposicao(60, 30, 5, 7)?.cenarios).toEqual([{ dias: 7, unidades: 9 }, { dias: 10, unidades: 15 }, { dias: 15, unidades: 25 }]);
  });
  it('antecipa reposição pelo prazo informado e cobre 28 dias após chegada', () => {
    expect(planejarReposicao(60, 30, 30, 7)).toMatchObject({ cobertura: 15, iniciarEm: 8, envio: 40 });
  });
  it('não transforma estoque ausente em zero nem prevê ruptura sem vendas', () => {
    expect(planejarReposicao(30, 30, null, 7)).toBeNull();
    expect(planejarReposicao(0, 30, 5, 7)).toMatchObject({ cobertura: null, iniciarEm: null, envio: 0 });
  });
});