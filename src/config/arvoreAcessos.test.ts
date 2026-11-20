import { expect, it } from 'vitest';
import { destinoAcesso } from './arvoreAcessos';
it('preserva Cust ID nos anúncios e ID da conta nas ferramentas de gestão', () => {
  expect(destinoAcesso({ id: 'abc', label: '', permissao: '', caminho: '/anuncios', aba: 'abc' }, '123', 'uuid')).toBe('/anuncios?aba=abc&loja=123');
  expect(destinoAcesso({ id: 'ads', label: '', permissao: '', caminho: '/publicidade', aba: 'campanhas' }, '123', 'uuid')).toBe('/publicidade?aba=campanhas&conta=uuid&loja=123');
});
it('leva a loja à gestão de campanhas mesmo antes de carregar sua conta', () => {
  expect(destinoAcesso({ id: 'ads', label: '', permissao: '', caminho: '/publicidade', aba: 'campanhas' }, '222')).toBe('/publicidade?aba=campanhas&loja=222');
});
it('retorna da gestão à mesma loja do painel', () => {
  expect(destinoAcesso({ id: 'resumo', label: '', permissao: '', secao: 'publicidade', subaba: 'resumo' }, '222')).toBe('/?aba=publicidade&subaba=resumo&loja=222');
});