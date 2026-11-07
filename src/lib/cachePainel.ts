import type { Query, QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { registrarAviso } from '@/lib/avisosDesenvolvedor';

export const CACHE_PREFIXO = 'peregrinus-cache-';
export const CACHE_VALIDADE_MS = 24 * 60 * 60 * 1000;
export const LIMITE_LENTIDAO_MS = 1000;
// Nunca persistir permissões, avisos ou sessões: precisam sempre da leitura atual do servidor.
const NAO_PERSISTIR = ['minhas-permissoes', 'developer-alerts', 'sou-desenvolvedor', 'auth', 'session'];

export const respostaLenta = (ms: number) => Number.isFinite(ms) && ms > LIMITE_LENTIDAO_MS;
// Map/Set/Date viram objetos simples no JSON e quebram a tela ao restaurar.
export const serializavel = (v: unknown, prof = 0): boolean => {
  if (v instanceof Map || v instanceof Set || v instanceof Date) return false;
  if (!v || typeof v !== 'object' || prof > 4) return true;
  const vals = Array.isArray(v) ? v.slice(0, 3) : Object.values(v);
  return vals.every((x) => serializavel(x, prof + 1));
};
export const devePersistir = (q: Pick<Query, 'queryKey' | 'state'>) =>
  q.state.status === 'success' && !NAO_PERSISTIR.includes(String(q.queryKey[0])) && serializavel(q.state.data);

const armazenamento = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* cota cheia: segue sem cache */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

export const criarPersister = (userId: string) =>
  createSyncStoragePersister({ storage: armazenamento, key: CACHE_PREFIXO + userId, throttleTime: 2000 });

export function limparCachePainel() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIXO)).forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
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
          limparCachePainel();
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
