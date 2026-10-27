import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { pctFracao } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

export type ReputacaoResumo = {
  nivel?: string | null;
  medalha?: string | null;
  reclamacoes?: number | null;
  atrasos?: number | null;
  cancelamentos?: number | null;
  periodo?: string | null;
};
const niveis: Record<string, string> = {
  '5_green': 'Verde', '4_light_green': 'Verde-claro', '3_yellow': 'Amarelo',
  '2_orange': 'Laranja', '1_red': 'Vermelho', green: 'Verde', light_green: 'Verde-claro',
  yellow: 'Amarelo', orange: 'Laranja', red: 'Vermelho', newbie: 'Novo vendedor',
};
const medalhas: Record<string, string> = { platinum: 'MercadoLíder Platinum', gold: 'MercadoLíder Gold', silver: 'MercadoLíder' };

export default function ResumoReputacao({ dados, atualizadoEm }: { dados?: ReputacaoResumo | null; atualizadoEm?: string }) {
  const nivel = dados?.nivel ?? '';
  const normalizado = nivel.replace(/_(platinum|gold|silver)$/, '');
  const medalha = dados?.medalha ?? nivel.match(/_(platinum|gold|silver)$/)?.[1];
  const posicao = ['1_red', '2_orange', '3_yellow', '4_light_green', '5_green'].indexOf(
    ({ red: '1_red', orange: '2_orange', yellow: '3_yellow', light_green: '4_light_green', green: '5_green' } as Record<string, string>)[normalizado] ?? normalizado,
  );
  return <section aria-label="Diagnóstico de reputação" className="ds-glass-surface resumo-reputacao rounded-2xl p-5 space-y-5 min-w-0">
    <header className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary shrink-0" /><h3 className="text-sm font-semibold">Saúde da conta</h3></header>
    <div>
      <p className="text-lg font-semibold break-words">{niveis[normalizado] ?? 'Sem dado'}{medalha && medalhas[medalha] ? ` · ${medalhas[medalha]}` : ''}</p>
      <div className="reputacao-regua mt-3" aria-label={`Reputação: ${niveis[normalizado] ?? 'não informada'}`}>
        {[0, 1, 2, 3, 4].map(i => <span key={i} data-faixa={i} data-atual={posicao === i ? 'true' : undefined} />)}
      </div>
    </div>
    <dl className="grid grid-cols-3 gap-3">
      {[
        { nome: 'Reclamações', valor: dados?.reclamacoes },
        { nome: 'Atrasos', valor: dados?.atrasos },
        { nome: 'Cancelamentos', valor: dados?.cancelamentos },
      ].map(m => <div key={m.nome} className="min-w-0"><dt className="text-xs text-muted-foreground break-words">{m.nome}</dt><dd className="mt-1 text-base font-semibold tabular-nums break-words">{pctFracao(m.valor, 2)}</dd></div>)}
    </dl>
    <footer className="border-t border-border pt-3 space-y-1 text-xs text-muted-foreground">
      <p>Restrições da conta: não consultadas</p>
      <p>{dados?.periodo ? `Janela oficial: ${dados.periodo}` : 'Último retrato de reputação disponível'}{atualizadoEm ? ` · ${new Date(atualizadoEm).toLocaleDateString('pt-BR')}` : ''}</p>
    </footer>
  </section>;
}

export function ReputacaoResumoApi({ custId }: { custId: string }) {
  const q = useQuery({
    queryKey: ['ml-reputacao-resumo', custId], staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('ml_sync_tema').select('dados, atualizado_em, erro').eq('cust_id', custId).eq('tema', 'reputacao').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  return <ResumoReputacao dados={q.error || q.data?.erro ? null : q.data?.dados as ReputacaoResumo | undefined} atualizadoEm={q.data?.atualizado_em} />;
}