import { describe, expect, it } from 'vitest';
import { resolverContaPublicidade } from './contaPublicidade';

const contas = [{ id: 'conta-a', ml_user_id: 111 }, { id: 'conta-b', ml_user_id: 222 }];
describe('loja herdada na publicidade', () => {
  it('mantém a loja do painel mesmo quando outra conta é a primeira', () => {
    expect(resolverContaPublicidade(contas, '222', null)).toEqual(contas[1]);
  });
  it('não escolhe conta enquanto as autorizações carregam', () => {
    expect(resolverContaPublicidade(undefined, '222', null)).toBeUndefined();
  });
  it('não substitui loja sem conta gerenciável por outra loja', () => {
    expect(resolverContaPublicidade(contas, '333', null)).toBeUndefined();
  });
  it('não aceita conta que contradiz a loja herdada', () => {
    expect(resolverContaPublicidade(contas, '222', 'conta-a')).toBeUndefined();
  });
  it('não escolhe automaticamente uma loja sem contexto', () => {
    expect(resolverContaPublicidade(contas, null, null)).toBeUndefined();
  });
  it('preserva links antigos somente para a conta explicitamente autorizada', () => {
    expect(resolverContaPublicidade(contas, null, 'conta-b')).toEqual(contas[1]);
    expect(resolverContaPublicidade(contas, null, 'desconhecida')).toBeUndefined();
  });
});