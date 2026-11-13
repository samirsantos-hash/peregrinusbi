import { describe, expect, it } from 'vitest';
import { RAMOS_DIDATICOS, paginaDidatica } from './arvoreAcessos';

describe('navegação somente leitura do modo didático', () => {
  it('oferece somente as duas análises implementadas e nenhuma rota de gestão', () => {
    const acessos = RAMOS_DIDATICOS.flatMap(r => r.acessos);
    expect(acessos.map(a => a.subaba)).toEqual(['indicadores', 'historico']);
    expect(acessos.every(a => !a.caminho && a.permissao === 'resumo.visualizar')).toBe(true);
  });
  it('links avançados e entrada sem seleção abrem indicadores, não uma função de gestão', () => {
    expect(paginaDidatica('gestao-campanhas')).toBe('indicadores');
    expect(paginaDidatica(null)).toBe('indicadores');
    expect(paginaDidatica('historico')).toBe('historico');
  });
});