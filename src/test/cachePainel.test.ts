import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { QueryClient } from '@tanstack/react-query';
import { dehydrate } from '@tanstack/react-query';
import { CACHE_BUSTER, CACHE_VALIDADE_MS, LIMITE_CACHE_BYTES, criarPersister, limparCachePainel, respostaLenta, devePersistir, serializavel } from '@/lib/cachePainel';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
const consulta = (data: unknown, key: unknown[] = ['ml-curva-abc', 'loja-1', 30]) => ({ queryKey: key, state: { status: 'success', data } } as never);
function salvo(data = { total: 10 }): PersistedClient {
  const client = new QueryClient();
  client.setQueryData(['ml-curva-abc', 'loja-1', 30], data);
  return { timestamp: Date.now(), buster: CACHE_BUSTER, clientState: dehydrate(client) };
}
describe('cache e lentidão', () => {
  it('alerta só acima de 1 segundo', () => { expect(respostaLenta(1000)).toBe(false); expect(respostaLenta(1001)).toBe(true); });
  it('nunca guarda permissões', () => {
    expect(devePersistir({ queryKey: ['minhas-permissoes'], state: { status: 'success' } } as never)).toBe(false);
    expect(devePersistir(consulta({ total: 10 }))).toBe(true);
  });
  it('recusa dados pessoais inclusive no quarto registro e em campos aninhados', () => {
    for (const campo of ['cpf', 'cnpj', 'comprador', 'endereco', 'email', 'token', 'receiver_name']) {
      expect(devePersistir(consulta([{ total: 1 }, { total: 2 }, { total: 3 }, { detalhe: { [campo]: 'privado' } }]))).toBe(false);
    }
  });
  it('não persiste listas longas nem leituras de acesso', () => {
    expect(devePersistir(consulta(Array.from({ length: 2001 }, () => ({ total: 1 }))))).toBe(false);
    expect(devePersistir(consulta({ total: 1 }, ['ml-contas-gerenciaveis']))).toBe(false);
    expect(devePersistir(consulta({ total: 1 }, ['pedido-detalhe', 'loja-1']))).toBe(false);
    expect(devePersistir(consulta({ total: 1 }, ['ml-curva-abc', '']))).toBe(false);
  });
  it('não perde tipos especiais ao serializar', () => {
    expect(serializavel([1, 2, 3, new Map()])).toBe(false);
    expect(serializavel({ total: NaN })).toBe(false);
  });
  it('isola usuário, loja e período e restaura uma cópia válida', async () => {
    await limparCachePainel();
    const a = criarPersister('a'), b = criarPersister('b');
    await a.persistClient(salvo());
    expect(await b.restoreClient()).toBeUndefined();
    const restaurado = await a.restoreClient();
    expect(restaurado?.clientState.queries[0].queryKey).toEqual(['ml-curva-abc', 'loja-1', 30]);
    expect(restaurado?.clientState.queries[0].state.data).toEqual({ total: 10 });
  });
  it('expira em 24 horas e rejeita versão anterior', async () => {
    const p = criarPersister('expira');
    await p.persistClient({ ...salvo(), timestamp: Date.now() - CACHE_VALIDADE_MS - 1 });
    expect(await p.restoreClient()).toBeUndefined();
    await p.persistClient({ ...salvo(), buster: 'v3' });
    expect(await p.restoreClient()).toBeUndefined();
  });
  it('purga disco e cópias antigas sem permitir escrita tardia', async () => {
    const p = criarPersister('purga');
    localStorage.setItem('peregrinus-cache-legado', 'privado');
    await p.persistClient(salvo());
    await limparCachePainel();
    await p.persistClient(salvo());
    expect(await criarPersister('purga').restoreClient()).toBeUndefined();
    expect(localStorage.getItem('peregrinus-cache-legado')).toBeNull();
  });
  it('não grava mais de 5 MiB', async () => {
    const p = criarPersister('limite');
    await p.persistClient(salvo({ total: 'x'.repeat(LIMITE_CACHE_BYTES) } as never));
    expect(await p.restoreClient()).toBeUndefined();
  });
});
