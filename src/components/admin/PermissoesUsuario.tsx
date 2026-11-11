import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { FUNCOES_PERMISSAO, NIVEIS_CLIENTE, alterarChecklist, nivelDoChecklist } from '@/lib/permissoes';
import { rpcPermissoes } from '@/hooks/usePermissoes';
import { useToast } from '@/hooks/use-toast';

type Revisao = { permissoes: string[]; legado: boolean; revisado_em: string | null; revisado_por: string | null; master: boolean };
export default function PermissoesUsuario({ userId, email, onClose, onSaved }: { userId: string; email: string; onClose: () => void; onSaved: () => void }) {
  const [dados, setDados] = useState<Revisao | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  useEffect(() => { let ativo = true; rpcPermissoes<Revisao>('permissoes_do_usuario', { p_user_id: userId }).then(r => { if (ativo) { setDados(r); setSelecionadas(r.permissoes); } }).catch(e => { if (ativo) setErro(e.message); }); return () => { ativo = false; }; }, [userId]);
  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      await rpcPermissoes('salvar_permissoes', { p_user_id: userId, p_permissoes: selecionadas });
      await qc.invalidateQueries();
      toast({ title: 'Permissões aprovadas', description: email }); onSaved(); onClose();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setSalvando(false); setConfirmar(false); }
  };
  const grupos = [...new Set(FUNCOES_PERMISSAO.map(f => f.grupo))];
  return <Sheet open onOpenChange={v => { if (!v && !salvando) onClose(); }}>
    <SheetContent className="w-full sm:max-w-3xl flex flex-col gap-4 overflow-hidden">
      <SheetHeader><SheetTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Permissões do usuário</SheetTitle><SheetDescription className="break-all">{email}</SheetDescription></SheetHeader>
      {erro && <p role="alert" className="text-destructive text-sm">{erro}</p>}
      {!dados && !erro && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      {dados && <>
        <div className="border-b border-border pb-3 text-sm text-muted-foreground">{dados.master ? 'Master · acesso completo' : dados.legado ? 'Aguardando revisão · acessos atuais preservados' : dados.revisado_em ? `Revisado em ${new Date(dados.revisado_em).toLocaleString('pt-BR')}` : 'Sem funções liberadas'}</div>
        {!dados.master && <section aria-label="Nível do cliente" className="space-y-2">
          <h3 className="text-base font-semibold">Nível do cliente</h3>
          <div className="grid gap-2 sm:grid-cols-3">{NIVEIS_CLIENTE.map(n => { const ativo = nivelDoChecklist(selecionadas) === n.id; return <button key={n.id} type="button" disabled={salvando} aria-pressed={ativo} onClick={() => setSelecionadas(n.permissoes)} className={`rounded-lg border p-3 text-left transition-transform active:scale-[0.98] ${ativo ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'}`}><span className="block font-semibold">{n.nome}</span><span className="block text-xs text-muted-foreground">{n.descricao}</span></button>; })}</div>
          <p className="text-xs text-muted-foreground">O nível marca as liberações abaixo; você ainda pode ajustar item a item antes de aprovar.</p>
        </section>}
        <div className="flex-1 overflow-auto min-h-0">
          {grupos.map(grupo => <section key={grupo} className="mb-5">
            <h3 className="text-base font-semibold py-3">{grupo}</h3>
            <Table><TableHeader><TableRow><TableHead>Função</TableHead><TableHead className="w-24 text-center">Visualizar</TableHead><TableHead>Alterar</TableHead></TableRow></TableHeader><TableBody>
              {FUNCOES_PERMISSAO.filter(f => f.grupo === grupo).map(f => <TableRow key={f.id} className="border-b border-border even:bg-muted/20">
                <TableCell className="font-medium align-top">{f.nome}</TableCell>
                <TableCell className="text-center align-top"><Checkbox aria-label={`Visualizar ${f.nome}`} disabled={dados.master || salvando} checked={dados.master || selecionadas.includes(`${f.id}.visualizar`)} onCheckedChange={v => setSelecionadas(p => alterarChecklist(p, `${f.id}.visualizar`, v === true))} /></TableCell>
                <TableCell>{f.acoes.length ? <div className="space-y-3">{f.acoes.map(a => <label key={a.id} className="flex gap-2 items-start text-sm"><Checkbox aria-label={a.nome} disabled={dados.master || salvando} checked={dados.master || selecionadas.includes(a.id)} onCheckedChange={v => setSelecionadas(p => alterarChecklist(p, a.id, v === true))} /><span>{a.nome}</span></label>)}</div> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>)}
            </TableBody></Table>
          </section>)}
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{selecionadas.length} liberações selecionadas</span><Button disabled={dados.master || salvando} onClick={() => setConfirmar(true)}><Save className="h-4 w-4 mr-2" />Aprovar permissões</Button></div>
      </>}
      <AlertDialog open={confirmar} onOpenChange={setConfirmar}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Aprovar este checklist?</AlertDialogTitle><AlertDialogDescription>O acesso de {email} passará a seguir somente as {selecionadas.length} liberações selecionadas. As demais funções serão bloqueadas. Os vínculos de lojas não serão ampliados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel><AlertDialogAction disabled={salvando} onClick={e => { e.preventDefault(); void salvar(); }}>{salvando ? 'Salvando…' : 'Confirmar aprovação'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </SheetContent>
  </Sheet>;
}