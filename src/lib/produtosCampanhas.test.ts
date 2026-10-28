import { describe, expect, it } from 'vitest';
import { campanhaElegivel, fonteProdutos, produtosVisiveis } from './produtosCampanhas';
describe('produtos e campanhas', () => {
  it('mostra dez produtos inicialmente e permite expandir', () => {
    const itens = Array.from({ length: 94 }, (_, i) => i);
    expect(produtosVisiveis(itens, false)).toHaveLength(10);
    expect(produtosVisiveis(itens, true)).toHaveLength(94);
  });
  it('usa API na loja conectada e planilhas sem conexão', () => {
    expect(fonteProdutos({ status: 'active' })).toBe('api');
    expect(fonteProdutos(null)).toBe('planilha');
    expect(fonteProdutos({ status: 'inactive' })).toBe('planilha');
  });
  it('não confunde participação ativa com convite elegível', () => {
    expect(campanhaElegivel('candidate')).toBe(true);
    expect(campanhaElegivel('candidated')).toBe(true);
    expect(campanhaElegivel('started')).toBe(false);
    expect(campanhaElegivel('finished')).toBe(false);
  });
});