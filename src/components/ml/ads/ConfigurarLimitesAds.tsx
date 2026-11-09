import { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Loader2, Save, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { usePermissoes } from '@/hooks/usePermissoes';
import { CAMPOS_LIMITES, formularioLimites, prepararLimites } from '@/lib/limitesPublicidade';
import type { Limites } from '../../../../supabase/functions/_shared/mlAdsGestao';

export function ConfigurarLimitesAds({ contaId, limites, aoSalvar }: { contaId: string; limites: Limites; aoSalvar: () => void }) {
  const { pode } = usePermissoes();
  const [aberto, setAberto] = useState(false);
  const [inicial, setInicial] = useState(() => formularioLimites(limites));
  const [form, setForm] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  if (!pode('integracoes.configurar')) return null;

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const preparado = prepararLimites(form, inicial);
    if (!preparado.valores) { setErro(preparado.erro); return; }
    setSalvando(true); setErro(null);
    try {
      const { data, error } = await supabase.functions.invoke('ml-settings', { method: 'PATCH', body: { account_id: contaId, ...preparado.valores } });
      if (error) {
        let mensagem = 'Não foi possível salvar os limites. Tente novamente.';
        if (error instanceof FunctionsHttpError) {
          const resposta = await error.context.json().catch(() => null);
          if (error.context.status === 403) mensagem = 'Você não tem permissão para configurar esta loja.';
          else if (Array.isArray(resposta?.erros)) mensagem = 'Confira os limites informados.';
        }
        throw new Error(mensagem);
      }
      if (!data || data.account_id !== contaId) throw new Error('O salvamento não foi confirmado. Atualize e confira os limites.');
      aoSalvar(); setAberto(false); setSucesso(true);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar os limites.'); }
    finally { setSalvando(false); }
  };

  return <>
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => { const atual = formularioLimites(limites); setInicial(atual); setForm(atual); setErro(null); setSucesso(false); setAberto(true); }}>
        <SlidersHorizontal className="mr-2 h-4 w-4" />Configurar limites
      </Button>
      {sucesso && <span role="status" className="text-sm text-primary">Limites salvos para esta loja.</span>}
    </div>
    <Dialog open={aberto} onOpenChange={(valor) => { if (!salvando) setAberto(valor); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Limites de publicidade</DialogTitle><DialogDescription>Referências desta loja. Salvar não altera campanhas nem seus orçamentos.</DialogDescription></DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAMPOS_LIMITES.map((campo) => <div key={campo.chave} className="min-w-0 space-y-2">
              <Label htmlFor={`limite-${campo.chave}`} className="block leading-5">{campo.nome} ({campo.unidade})</Label>
              <Input id={`limite-${campo.chave}`} inputMode="decimal" value={form[campo.chave]} disabled={salvando} onChange={(e) => setForm((atual) => ({ ...atual, [campo.chave]: e.target.value }))} />
            </div>)}
          </div>
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" disabled={salvando} onClick={() => setAberto(false)}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar limites</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}