import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireEnv } from './env.ts';

export function segredoRotina(req: Request) {
  const recebido = req.headers.get('x-refresh-secret') ?? '';
  const esperado = Deno.env.get('REFRESH_TRIGGER_SECRET') ?? '';
  if (!esperado || recebido.length !== esperado.length) return false;
  let diferente = 0; for (let i = 0; i < esperado.length; i++) diferente |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  return diferente === 0;
}
/** Always validates identity; never treats apikey or an unverified JWT as a service exception. */
export async function exigirPermissao(req: Request, permissoes: string | string[], rotina = false): Promise<Response | null> {
  if (rotina && segredoRotina(req)) return null;
  const auth = req.headers.get('Authorization') ?? '';
  const negar = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!auth.startsWith('Bearer ')) return negar(401, 'Faça login.');
  const cliente = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } } });
  const { data, error } = await cliente.auth.getUser();
  if (error || !data.user) return negar(401, 'Faça login.');
  const lista = Array.isArray(permissoes) ? permissoes : [permissoes];
  const { data: permitido, error: erro } = await cliente.rpc('usuario_tem_alguma_permissao', { p_permissoes: lista });
  return erro || permitido !== true ? negar(403, 'Esta função não foi liberada pela conta master.') : null;
}
export function permissaoAcao(acao: string, dados: Record<string, unknown>): string | null {
  if (acao === 'preco.alterar') return 'preco.alterar';
  if (acao === 'ads') {
    const tipo = String(dados.tipo ?? '');
    if (['campanha_criar', 'campanha_editar'].includes(tipo)) return 'publicidade.campanhas';
    if (['grupos_incluir', 'grupos_status', 'grupos_remover'].includes(tipo)) return 'publicidade.anuncios';
  }
  if (acao === 'promocao') {
    const tipo = String(dados.acao ?? '');
    if (['sair', 'cupom_excluir'].includes(tipo)) return 'promocoes.remover';
    if (['aderir', 'alterar', 'cupom_criar'].includes(tipo)) return 'promocoes.aplicar';
  }
  return null;
}