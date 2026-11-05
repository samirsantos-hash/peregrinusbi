import { describe, it, expect, vi, afterEach } from 'vitest';
import { novoEstado, registrar, emergenciaAtiva, chaveLeitura, PAUSA_MS, instalarSaidaEmergencia } from '@/lib/saidaEmergencia';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as any).__saidaEmergencia; });

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
  it('não guarda permissões nem avisos privados', () => {
    for (const path of ['/rest/v1/usuario_permissoes', '/rest/v1/developer_alerts', '/rest/v1/rpc/get_perfil']) {
      expect(chaveLeitura(path.includes('/rpc/') ? 'POST' : 'GET', new URL('https://x.co' + path), '{}')).toBeNull();
    }
  });
  it('depois de salvar uma meta lê o valor novo, mesmo em emergência', async () => {
    vi.spyOn(window, 'setInterval').mockImplementation(() => ({}) as ReturnType<typeof setInterval>);
    let valor = 10;
    const rede = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === 'PATCH') { valor = 20; return new Response(null, { status: 204 }); }
      return new Response(JSON.stringify({ valor }), { status: 200 });
    });
    window.fetch = rede;
    instalarSaidaEmergencia('https://x.co');
    const url = 'https://x.co/rest/v1/metas_loja';
    await window.fetch(url);
    rede.mockImplementationOnce(async () => new Response('', { status: 503 })); await window.fetch(url);
    rede.mockImplementationOnce(async () => new Response('', { status: 503 })); await window.fetch(url);
    rede.mockImplementationOnce(async () => new Response('', { status: 503 })); await window.fetch(url);
    expect(await (await window.fetch(url)).json()).toEqual({ valor: 10 });
    await window.fetch(url, { method: 'PATCH', body: '{}' });
    expect(await (await window.fetch(url)).json()).toEqual({ valor: 20 });
    expect(rede).toHaveBeenCalledTimes(6);
  });
  it('falhas nas análises não ativam emergência nas leituras do banco', async () => {
    vi.spyOn(window, 'setInterval').mockImplementation(() => ({}) as ReturnType<typeof setInterval>);
    const rede = vi.fn(async (input: unknown) => new Response('{}', { status: String(input).includes('/functions/') ? 503 : 200 }));
    window.fetch = rede;
    instalarSaidaEmergencia('https://x.co');
    await window.fetch('https://x.co/rest/v1/sellers');
    for (let i = 0; i < 3; i++) await window.fetch('https://x.co/functions/v1/ml-analise-loja', { method: 'POST' });
    await window.fetch('https://x.co/rest/v1/sellers');
    expect(rede).toHaveBeenCalledTimes(5);
  });
});
