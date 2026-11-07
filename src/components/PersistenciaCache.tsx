import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSubscribe } from '@tanstack/react-query-persist-client';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_BUSTER, CACHE_VALIDADE_MS, criarPersister, devePersistir, limparCachePainel, monitorarLentidao, trocouIdentidade } from '@/lib/cachePainel';

/** Guarda as telas já abertas por 24h, separado por usuário, e mede lentidão. */
export default function PersistenciaCache({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { user, loading } = useAuth();
  const [pronto, setPronto] = useState<string | null | undefined>(undefined);
  const [epoca, setEpoca] = useState(0);
  const anterior = useRef<string | null | undefined>(undefined);
  useEffect(() => monitorarLentidao(client), [client]);
  useEffect(() => client.getQueryCache().subscribe(ev => {
    if (ev.type === 'updated' && ev.query.queryKey[0] === 'minhas-permissoes' && ev.action.type === 'success') setEpoca(e => e + 1);
  }), [client]);
  useEffect(() => {
    if (loading) return;
    const atual = user?.id ?? null;
    // Mudou a identidade (saída, troca de conta): descarta tudo que está em memória
    // antes de restaurar o cache do novo usuário, para não exibir nem salvar dados do anterior.
    const mudou = trocouIdentidade(anterior.current, atual);
    anterior.current = atual;
    let ativo = true;
    let parar: (() => void) | undefined;
    void (async () => {
      if (mudou) { await client.cancelQueries(); client.clear(); await limparCachePainel(); }
      if (!ativo) return;
      if (!atual) { setPronto(null); return; }
      const opcoes = { queryClient: client, persister: criarPersister(atual), maxAge: CACHE_VALIDADE_MS, buster: CACHE_BUSTER, dehydrateOptions: { shouldDehydrateQuery: devePersistir } };
      // Only the first mount restores. Permission events restart the subscription,
      // never rehydrate data removed by a revocation.
      if (pronto !== atual) {
        await persistQueryClientRestore(opcoes);
        if (!ativo) return;
        setPronto(atual);
      }
      parar = persistQueryClientSubscribe(opcoes);
    })();
    return () => { ativo = false; parar?.(); };
  }, [client, user?.id, loading, epoca]);
  return !loading && pronto === (user?.id ?? null) ? children : null;
}
