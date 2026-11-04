import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_VALIDADE_MS, criarPersister, devePersistir, monitorarLentidao } from '@/lib/cachePainel';

/** Guarda as telas já abertas por 24h, separado por usuário, e mede lentidão. */
export default function PersistenciaCache() {
  const client = useQueryClient();
  const { user } = useAuth();
  useEffect(() => monitorarLentidao(client), [client]);
  useEffect(() => {
    if (!user?.id) return;
    const [parar] = persistQueryClient({
      queryClient: client, persister: criarPersister(user.id), maxAge: CACHE_VALIDADE_MS, buster: 'v2',
      dehydrateOptions: { shouldDehydrateQuery: devePersistir },
    });
    return parar;
  }, [client, user?.id]);
  return null;
}
