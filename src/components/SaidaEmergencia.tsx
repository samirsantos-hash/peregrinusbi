import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EVENTO } from '@/lib/saidaEmergencia';

/** Aviso e pausa das atualizações automáticas enquanto a saída de emergência estiver ativa. */
export default function SaidaEmergencia() {
  const client = useQueryClient();
  const [ativa, setAtiva] = useState(false);
  useEffect(() => {
    const normal = client.getDefaultOptions();
    const ouvir = (e: Event) => {
      const on = Boolean((e as CustomEvent).detail?.ativa);
      setAtiva(on);
      client.setDefaultOptions(on
        ? { ...normal, queries: { ...normal.queries, refetchOnWindowFocus: false, refetchInterval: false, retry: 0 } }
        : normal);
    };
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, [client]);
  if (!ativa) return null;
  return (
    <div role="status" className="fixed top-3 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-border bg-card/90 px-4 py-2 text-sm text-foreground shadow-lg backdrop-blur">
      Muitos acessos agora: mostrando os últimos dados carregados. A atualização volta sozinha em instantes.
    </div>
  );
}
