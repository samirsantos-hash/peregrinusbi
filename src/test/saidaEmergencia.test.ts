import { describe, it, expect } from 'vitest';
import { novoEstado, registrar, emergenciaAtiva, chaveLeitura, PAUSA_MS } from '@/lib/saidaEmergencia';

describe('saída de emergência', () => {
  it('abre com 3 sinais de sobrecarga em 30 s e fecha após 60 s', () => {
    const e = novoEstado();
    expect(registrar(e, 0, 200, 3500)).toBe(false);
    expect(registrar(e, 1000, 503, 100)).toBe(false);
    expect(registrar(e, 2000, null, 10000)).toBe(true);
    expect(emergenciaAtiva(e, 2000 + PAUSA_MS - 1)).toBe(true);
    expect(emergenciaAtiva(e, 2000 + PAUSA_MS)).toBe(false);
  });
  it('sinais espalhados por mais de 30 s não abrem', () => {
    const e = novoEstado();
    registrar(e, 0, 429, 50); registrar(e, 20000, 429, 50);
    expect(registrar(e, 31000, 429, 50)).toBe(false);
  });
  it('respostas rápidas e normais não contam', () => {
    const e = novoEstado();
    for (let i = 0; i < 10; i++) expect(registrar(e, i, 200, 2900)).toBe(false);
  });
  it('escritas nunca são servidas da cópia guardada', () => {
    const u = (p: string) => new URL('https://x.co' + p);
    expect(chaveLeitura('GET', u('/rest/v1/sellers?select=id'), '')).not.toBeNull();
    expect(chaveLeitura('POST', u('/rest/v1/rpc/indicadores_carteira'), '{}')).not.toBeNull();
    expect(chaveLeitura('POST', u('/rest/v1/rpc/salvar_permissoes'), '{}')).toBeNull();
    expect(chaveLeitura('PATCH', u('/rest/v1/metas_loja'), '{}')).toBeNull();
    expect(chaveLeitura('POST', u('/rest/v1/metas_loja'), '{}')).toBeNull();
  });
});
