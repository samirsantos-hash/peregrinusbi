import { describe, it, expect } from 'vitest';
import { NIVEIS_CLIENTE, nivelDoChecklist, subanalisesDoNivel } from './permissoes';
const n = (id: string) => NIVEIS_CLIENTE.find(x => x.id === id)!.permissoes;
const escrita = (p: string) => !p.endsWith('.visualizar') && p !== 'relatorios.exportar';
describe('níveis de cliente', () => {
  it('Tiro vê somente a Análise geral do Resumo', () => { expect(n('tiro')).toEqual(['resumo.visualizar']); expect(subanalisesDoNivel(n('tiro'))).toEqual({ efficiency: ['analise'] }); expect(subanalisesDoNivel(n('medius'))).toBeNull(); expect(subanalisesDoNivel(n('tiro'), true)).toBeNull(); });
  it('Tiro só visualiza e não vê perguntas', () => { expect(n('tiro').every(p => p.endsWith('.visualizar'))).toBe(true); expect(n('tiro')).not.toContain('perguntas.visualizar'); });
  it('Medius vê mais que Tiro sem alterar dados', () => { expect(n('tiro').every(p => n('medius').includes(p))).toBe(true); expect(n('medius').length).toBeGreaterThan(n('tiro').length); expect(n('medius').some(escrita)).toBe(false); });
  it('Peritus faz gestão sem administrar usuários', () => { expect(n('peritus')).toContain('perguntas.responder'); expect(n('peritus')).toContain('carteiras.alterar'); expect(n('peritus').some(p => p.startsWith('usuarios.'))).toBe(false); });
  it('reconhece o nível pelo checklist', () => { expect(nivelDoChecklist([...n('medius')].reverse())).toBe('medius'); expect(nivelDoChecklist(['reputacao.visualizar'])).toBeNull(); });
});

import { PERFIS_EQUIPE, perfilDoChecklist, PERMISSAO_PAI } from './permissoes';
describe('perfis da equipe', () => {
  const analista = PERFIS_EQUIPE.find(p => p.id === 'analista')!.permissoes;
  it('analista não altera preços, promoções nem campanhas', () => {
    for (const p of ['preco.alterar', 'promocoes.aplicar', 'promocoes.remover', 'publicidade.campanhas', 'publicidade.anuncios']) expect(analista).not.toContain(p);
    expect(analista.filter(p => PERMISSAO_PAI[p] && p !== 'relatorios.exportar')).toEqual([]);
  });
  it('analista vê os indicadores', () => { for (const p of ['resumo.visualizar', 'publicidade.visualizar', 'preco.visualizar']) expect(analista).toContain(p); });
  it('troca reconhece o perfil', () => { expect(perfilDoChecklist(analista)).toBe('analista'); expect(perfilDoChecklist(PERFIS_EQUIPE[0].permissoes)).toBe('consultor'); });
});
