import { expect, it } from 'vitest';
import { destinoAcesso } from './arvoreAcessos';
it('preserva Cust ID nos anúncios e ID da conta nas ferramentas de gestão', () => {
  expect(destinoAcesso({ id: 'abc', label: '', permissao: '', caminho: '/anuncios', aba: 'abc' }, '123', 'uuid')).toBe('/anuncios?aba=abc&loja=123');
  expect(destinoAcesso({ id: 'ads', label: '', permissao: '', caminho: '/publicidade', aba: 'campanhas' }, '123', 'uuid')).toBe('/publicidade?aba=campanhas&conta=uuid');
});