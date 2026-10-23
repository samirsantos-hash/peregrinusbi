import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, RefreshCw, Shield, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDesenvolvedor } from '@/hooks/useDesenvolvedor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ds';
import { PERFIS_SISTEMA } from '@/lib/avisosDesenvolvedor';
import { dataHoraBr } from '@/lib/mlFuncoes';
import { num } from '@/lib/format';

const CATEGORIAS: Record<string, string> = { carregamento: 'Carregamento', atualizacao: 'Atualização', erro: 'Erros e falhas', lentidao: 'Lentidão', seguranca: 'Segurança' };

export default function PainelAvisos() {
  const { autorizado } = useDesenvolvedor();
  const qc = useQueryClient();
  const [categoria, setCategoria] = useState('todos');
  const [situacao, setSituacao] = useState('pendentes');
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['developer-alerts'], enabled: autorizado, refetchInterval: 15000,
    queryFn: async () => {
      const [avisos, operacionais] = await Promise.all([
        supabase.from('developer_alerts').select('*').order('criado_em', { ascending: false }).limit(200),
        supabase.rpc('avisos_operacionais_existentes'),
      ]);
      if (avisos.error) throw avisos.error;
      if (operacionais.error) throw operacionais.error;
      return [...(avisos.data ?? []).map(a => ({ ...a, persistido: true })), ...(operacionais.data ?? []).map(a => ({ ...a, duracao_ms: null, reconhecido_em: null, persistido: false }))]
        .sort((a,b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
    },
  });
  if (!autorizado) return null;
  const avisos = (query.data ?? []).filter(a => (categoria === 'todos' || a.categoria === categoria) && (situacao === 'todos' || !a.reconhecido_em));
  async function reconhecer(id: string) {
    setErroAcao(null); setProcessando(id);
    const { error } = await supabase.rpc('reconhecer_aviso_desenvolvedor', { p_id: id });
    if (error) setErroAcao('Não foi possível marcar o aviso como ciente.');
    else await qc.invalidateQueries({ queryKey: ['developer-alerts'] });
    setProcessando(null);
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div><h2 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Avisos do desenvolvedor</h2><p className="text-sm text-muted-foreground">Samir Santos · Desenvolvedor</p></div>
      <Button variant="outline" size="icon" aria-label="Atualizar avisos" title="Atualizar avisos" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
    </div>
    <div className="flex flex-wrap gap-3">
      <Select value={categoria} onValueChange={setCategoria}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as categorias</SelectItem>{Object.entries(CATEGORIAS).map(([v,n]) => <SelectItem key={v} value={v}>{n}</SelectItem>)}</SelectContent></Select>
      <Select value={situacao} onValueChange={setSituacao}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendentes">Pendentes</SelectItem><SelectItem value="todos">Todos os avisos</SelectItem></SelectContent></Select>
      <span className="self-center text-sm text-muted-foreground">{num(avisos.length)} registros</span>
    </div>
    {erroAcao && <p role="alert" className="text-destructive text-sm">{erroAcao}</p>}
    {query.isLoading ? <p className="text-muted-foreground text-sm">Carregando avisos…</p> : query.isError ? <EmptyState falta="Não foi possível carregar os avisos." acao="Tente atualizar novamente." /> : avisos.length === 0 ? <EmptyState falta="Nenhum aviso neste filtro." /> : <ul className="max-h-[480px] overflow-y-auto divide-y divide-border border-y border-border pr-2">{avisos.map(a => <li key={a.id} className="flex items-start justify-between gap-3 py-4">
      <div className="min-w-0"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{CATEGORIAS[a.categoria] ?? a.categoria}</span><span>· {a.origem}</span><time>{dataHoraBr(a.criado_em)}</time></div><p className="mt-1 text-sm break-words">{a.mensagem}</p>{a.duracao_ms != null && <p className="text-xs text-muted-foreground">{num(a.duracao_ms)} ms</p>}{a.reconhecido_em && <p className="text-xs text-muted-foreground">Ciente em {dataHoraBr(a.reconhecido_em)}</p>}</div>
      {a.persistido && !a.reconhecido_em && <Button size="icon" variant="ghost" aria-label="Marcar como ciente" title="Marcar como ciente" onClick={() => void reconhecer(a.id)} disabled={processando === a.id}><Check className="h-4 w-4" /></Button>}
    </li>)}</ul>}
    <section className="border-t border-border pt-4"><h3 className="flex gap-2 items-center font-semibold text-sm"><Shield className="h-4 w-4" /> Segurança</h3><p className="text-sm text-muted-foreground mt-2">Não há detector de ataques conectado. Falhas de permissão e leitura não são confirmação de ataque.</p></section>
    <section className="border-t border-border pt-4"><h3 className="flex gap-2 items-center font-semibold text-sm"><GitBranch className="h-4 w-4" /> Árvore de perfis</h3><ul className="mt-3 space-y-2">{PERFIS_SISTEMA.map(p => <li key={p.nome} className={p.nivel === 0 ? 'text-sm font-semibold' : p.nivel === 1 ? 'ml-4 border-l border-border pl-4 text-sm' : p.nivel === 2 ? 'ml-8 border-l border-border pl-4 text-sm' : p.nivel === 3 ? 'ml-12 border-l border-border pl-4 text-sm' : 'ml-16 border-l border-border pl-4 text-sm'}>{p.nome}<span className="block text-xs text-muted-foreground font-normal">{p.escopo}</span></li>)}</ul></section>
  </div>;
}