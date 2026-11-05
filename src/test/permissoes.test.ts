import { describe, it, expect } from 'vitest';
import { alterarChecklist, podeExecutar } from '../lib/permissoes';
const revisado = { master: false, legado: false, revisado: true, permissoes: [] as string[] };
describe('liberação individual pela master', () => {
  it('bloqueia usuário novo sem liberação', () => expect(podeExecutar(revisado, 'resumo.visualizar')).toBe(false));
  it('preserva acessos de usuário antigo não revisado', () => expect(podeExecutar({ ...revisado, legado: true, revisado: false, permissoes: ['resumo.visualizar'] }, 'resumo.visualizar')).toBe(true));
  it('legado com visualização de carteira mantém leitura sem ganhar alteração', () => {
    const antigo = { ...revisado, legado: true, revisado: false, permissoes: ['carteiras.visualizar'] };
    expect(podeExecutar(antigo, 'carteiras.visualizar')).toBe(true);
    expect(podeExecutar(antigo, 'carteiras.alterar')).toBe(false);
  });
  it('carteira continua bloqueada após revogação ou para usuário novo', () => {
    expect(podeExecutar(revisado, 'carteiras.visualizar')).toBe(false);
    expect(podeExecutar({ ...revisado, revisado: false }, 'carteiras.visualizar')).toBe(false);
  });
  it('legado não ganha administração nova', () => expect(podeExecutar({ ...revisado, legado: true }, 'usuarios.criar')).toBe(false));
  it('libera todas as funções para master', () => expect(podeExecutar({ ...revisado, master: true }, 'usuarios.criar')).toBe(true));
  it('visualização não autoriza alteração', () => expect(podeExecutar({ ...revisado, permissoes: ['preco.visualizar'] }, 'preco.alterar')).toBe(false));
  it('relatórios visíveis não autorizam exportação', () => expect(podeExecutar({ ...revisado, permissoes: ['relatorios.visualizar'] }, 'relatorios.exportar')).toBe(false));
  it('exportação exige a liberação de relatórios', () => expect(podeExecutar({ ...revisado, permissoes: ['relatorios.visualizar', 'relatorios.exportar'] }, 'relatorios.exportar')).toBe(true));
  it('alterar exige visualizar', () => expect(podeExecutar({ ...revisado, permissoes: ['preco.alterar'] }, 'preco.alterar')).toBe(false));
  it('marcar alteração inclui visualização', () => expect(alterarChecklist([], 'preco.alterar', true)).toEqual(['preco.alterar', 'preco.visualizar']));
  it('revogar visualização revoga também alteração', () => expect(alterarChecklist(['preco.visualizar', 'preco.alterar'], 'preco.visualizar', false)).toEqual([]));
  it('recusa permissões inventadas até para master', () => expect(podeExecutar({ ...revisado, master: true }, 'usuarios.master')).toBe(false));
});