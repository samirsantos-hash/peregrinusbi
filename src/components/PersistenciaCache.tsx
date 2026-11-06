import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_VALIDADE_MS, criarPersister, devePersistir, monitorarLentidao, trocouIdentidade } from '@/lib/cachePainel';

/** Guarda as telas já abertas por 24h, separado por usuário, e mede lentidão. */
export default function PersistenciaCache() {
  const client = useQueryClient();
  const { user } = useAuth();
  const anterior = useRef<string | null | undefined>(undefined);
  useEffect(() => monitorarLentidao(client), [client]);
  useEffect(() => {
    const atual = user?.id ?? null;
    // Mudou a identidade (saída, troca de conta): descarta tudo que está em memória
    // antes de restaurar o cache do novo usuário, para não exibir nem salvar dados do anterior.
    if (trocouIdentidade(anterior.current, atual)) {
      void client.cancelQueries();
      client.clear();
    }
    anterior.current = atual;
    if (!atual) return;
    const [parar] = persistQueryClient({
      queryClient: client, persister: criarPersister(atual), maxAge: CACHE_VALIDADE_MS, buster: 'v3',
      dehydrateOptions: { shouldDehydrateQuery: devePersistir },
    });
    return parar;
  }, [client, user?.id]);
  return null;
}
