import { describe, it, expect } from 'vitest';
import { NIVEIS_CLIENTE, nivelDoChecklist } from './permissoes';
const n = (id: string) => NIVEIS_CLIENTE.find(x => x.id === id)!.permissoes;
const escrita = (p: string) => !p.endsWith('.visualizar') && p !== 'relatorios.exportar';
describe('níveis de cliente', () => {
  it('Tiro só visualiza e não vê perguntas', () => { expect(n('tiro').every(p => p.endsWith('.visualizar'))).toBe(true); expect(n('tiro')).not.toContain('perguntas.visualizar'); });
  it('Medius vê mais que Tiro sem alterar dados', () => { expect(n('tiro').every(p => n('medius').includes(p))).toBe(true); expect(n('medius').length).toBeGreaterThan(n('tiro').length); expect(n('medius').some(escrita)).toBe(false); });
  it('Peritus faz gestão sem administrar usuários', () => { expect(n('peritus')).toContain('perguntas.responder'); expect(n('peritus')).toContain('carteiras.alterar'); expect(n('peritus').some(p => p.startsWith('usuarios.'))).toBe(false); });
  it('reconhece o nível pelo checklist', () => { expect(nivelDoChecklist([...n('medius')].reverse())).toBe('medius'); expect(nivelDoChecklist(['resumo.visualizar'])).toBeNull(); });
});
