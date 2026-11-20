import type { Query, QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { registrarAviso } from '@/lib/avisosDesenvolvedor';

export const CACHE_PREFIXO = 'peregrinus-cache-';
export const CACHE_VALIDADE_MS = 24 * 60 * 60 * 1000;
export const LIMITE_LENTIDAO_MS = 1000;
// Nunca persistir permissões, avisos ou sessões: precisam sempre da leitura atual do servidor.
const NAO_PERSISTIR = ['minhas-permissoes', 'developer-alerts', 'sou-desenvolvedor', 'auth', 'session', 'ml-sou-consultor', 'ml-contas-gerenciaveis'];
const AGREGADOS = new Set(['seller-kpis', 'seller-kpis-daily', 'category-mix', 'ml-curva-abc', 'ml-curva-abc-anterior']);
const CAMPOS_PRIVADOS = /^(cpf|cnpj|documento|comprador|buyer|payer|endereco|address|shipping_address|receiver_address|receiver_name|telefone|phone|email|token|access_token|refresh_token|session|password|senha)$/i;
export const LIMITE_CACHE_BYTES = 5 * 1024 * 1024;
export const CACHE_BUSTER = 'v4-agregados-idb';

export const respostaLenta = (ms: number) => Number.isFinite(ms) && ms > LIMITE_LENTIDAO_MS;
// Map/Set/Date viram objetos simples no JSON e quebram a tela ao restaurar.
export const serializavel = (v: unknown, prof = 0): boolean => {
  if (prof > 20 || v instanceof Map || v instanceof Set || v instanceof Date) return false;
  if (v == null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.length <= 2000 && v.every(x => serializavel(x, prof + 1));
  return Object.getPrototypeOf(v) === Object.prototype && Object.entries(v).every(([k, x]) => !CAMPOS_PRIVADOS.test(k) && serializavel(x, prof + 1));
};
export const devePersistir = (q: Pick<Query, 'queryKey' | 'state'>) =>
  q.state.status === 'success' && AGREGADOS.has(String(q.queryKey[0])) &&
  typeof q.queryKey[1] === 'string' && q.queryKey[1].length > 0 && serializavel(q.state.data);

const BANCO = 'peregrinus-painel';
const STORE = 'agregados';
let geracao = 0;
function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(STORE);
    pedido.onerror = () => reject(pedido.error);
    pedido.onblocked = () => reject(new Error('Cache indisponível'));
    pedido.onsuccess = () => resolve(pedido.result);
  });
}
async function operar<T>(modo: IDBTransactionMode, acao: (store: IDBObjectStore) => IDBRequest<T>, valido = () => true): Promise<T | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await abrirBanco();
    if (!valido()) return undefined;
    return await new Promise<T>((resolve, reject) => {
      const transacao = db?.transaction(STORE, modo);
      if (!transacao) { reject(new Error('Cache indisponível')); return; }
      const pedido = acao(transacao.objectStore(STORE));
      transacao.oncomplete = () => resolve(pedido.result);
      transacao.onerror = () => reject(transacao.error);
      transacao.onabort = () => reject(transacao.error);
    });
  } catch { return undefined; } finally { db?.close(); }
}

export const criarPersister = (userId: string): Persister => {
  try { Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIXO)).forEach(k => localStorage.removeItem(k)); } catch { /* Legacy snapshots are never restored. */ }
  const minhaGeracao = geracao;
  const valido = () => geracao === minhaGeracao;
  return {
    persistClient: async cliente => {
      if (!valido()) return;
      const seguro = { ...cliente, clientState: { ...cliente.clientState, mutations: [], queries: cliente.clientState.queries.filter(q => devePersistir(q as unknown as Pick<Query, 'queryKey' | 'state'>)) } };
      if (new Blob([JSON.stringify(seguro)]).size > LIMITE_CACHE_BYTES) { await operar('readwrite', s => s.delete(userId), valido); return; }
      await operar('readwrite', s => s.put(seguro, userId), valido);
    },
    restoreClient: async () => {
      try {
      const cliente = await operar<PersistedClient | undefined>('readonly', s => s.get(userId), valido);
      if (!valido() || !cliente || cliente.buster !== CACHE_BUSTER || !Number.isFinite(cliente.timestamp) || Date.now() - cliente.timestamp > CACHE_VALIDADE_MS || !Array.isArray(cliente.clientState?.queries)) return undefined;
      return { ...cliente, clientState: { ...cliente.clientState, mutations: [], queries: cliente.clientState.queries.filter(q => devePersistir(q as unknown as Pick<Query, 'queryKey' | 'state'>)) } };
      } catch { return undefined; }
    },
    removeClient: async () => { await operar('readwrite', s => s.delete(userId), valido); },
  };
};

export function limparCachePainel() {
  geracao += 1; // invalidates in-flight writes/restores from the previous identity
  try { Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIXO)).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
  return operar('readwrite', s => s.clear());
}

/** Mede cada carregamento e avisa o desenvolvedor quando passa de 1 segundo. */
export function monitorarLentidao(client: QueryClient) {
  const inicio = new Map<string, number>();
  let ultimaPermissao: string | undefined;
  return client.getQueryCache().subscribe((ev) => {
    if (ev.type !== 'updated') return;
    const { query, action } = ev;
    if (action.type === 'fetch') inicio.set(query.queryHash, performance.now());
    if (action.type === 'success' || action.type === 'error') {
      const t0 = inicio.get(query.queryHash); inicio.delete(query.queryHash);
      if (t0 != null && !NAO_PERSISTIR.includes(String(query.queryKey[0]))) {
        const ms = performance.now() - t0;
        if (respostaLenta(ms)) void registrarAviso('resposta_lenta', undefined, ms);
      }
      if (action.type === 'success' && query.queryKey[0] === 'minhas-permissoes') {
        const atual = JSON.stringify(query.state.data);
        if (ultimaPermissao !== undefined && atual !== ultimaPermissao) {
          client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'minhas-permissoes' });
          void limparCachePainel();
        }
        ultimaPermissao = atual;
      }
    }
  });
}

/** Houve troca real de identidade (A→B ou A→ninguém)? A primeira definição não conta. */
export const trocouIdentidade = (anterior: string | null | undefined, atual: string | null) =>
  anterior !== undefined && anterior !== atual;

/** Cancelamentos esperados (troca de tela, sessão renovada) não são falhas. */
export const eCancelamento = (e: unknown) =>
  !!e && typeof e === 'object' && ((e as { name?: string }).name === 'AbortError' || /lock.*(released|stolen|acquire)|aborted/i.test(String((e as { message?: string }).message ?? '')));
