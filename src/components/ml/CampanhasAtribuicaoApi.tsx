import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { chamarFuncaoMl } from '@/lib/mlFuncoes';
import { num } from '@/lib/format';

type Diagnostico = {
  periodo: { inicio: string; fim: string };
  diagnostico: { consultados: number; disponiveis: number; indisponiveis: number; comCampanha: number; campanhaReconhecida: number; ofertaReconhecida: number };
};

export default function CampanhasAtribuicaoApi({ custId }: { custId?: string }) {
  const [consultar, setConsultar] = useState(false);
  const q = useQuery({
    queryKey: ['ml-campanhas-atribuicao-diagnostico', custId],
    enabled: !!custId && consultar,
    retry: false,
    staleTime: 300_000,
    queryFn: () => chamarFuncaoMl<Diagnostico>('ml-analise-loja', { cust_id: custId, modo: 'campanhasDiagnostico' }),
  });
  if (!custId) return null;
  return <section className="space-y-3 border-t border-border pt-4" aria-label="Campanhas aplicadas nas vendas">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-base font-medium">Campanhas aplicadas nas vendas · evolução diária</h3>
      <Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => { if (consultar) void q.refetch(); else setConsultar(true); }}>
        <RefreshCw className="mr-2 h-4 w-4" />{q.isFetching ? 'Consultando' : 'Verificar atribuição'}
      </Button>
    </div>
    {q.isFetching ? <Skeleton className="h-20 w-full" /> : q.error ? <p role="alert" className="text-sm text-destructive">{q.error.message}</p> : q.data ? <>
      <p className="text-sm text-muted-foreground">Série diária indisponível: o vínculo entre os descontos das vendas e as promoções ainda não está confirmado.</p>
      <p className="text-xs text-muted-foreground tabular-nums">Amostra: {num(q.data.diagnostico.consultados)} pedidos pagos consultados · {num(q.data.diagnostico.disponiveis)} com leitura de descontos · {num(q.data.diagnostico.indisponiveis)} sem leitura disponível.</p>
      <p className="text-xs text-muted-foreground">Amostra não representa o desempenho do período; não há distribuição estimada de vendas entre campanhas.</p>
    </> : <p className="text-sm text-muted-foreground">Sem atribuição confirmada por promoção. As médias do histórico abaixo não são vendas diárias da API.</p>}
  </section>;
}