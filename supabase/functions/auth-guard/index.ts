// auth-guard
// Login e pedido de troca de senha com limite de tentativas.
//
// Contrato (sem JWT):
// POST { acao: 'login', email, senha }
//   200 { access_token, refresh_token }
//   401 { error: 'credenciais' }             e-mail ou senha incorretos (mensagem única)
//   429 { error: 'bloqueado', minutos }       5 erros em 30 min bloqueiam o e-mail por 30 min
// POST { acao: 'reset', email }
//   200 { ok: true }                           sempre neutro: não revela se o e-mail existe
//   429 { error: 'limite', minutos }           3 pedidos por e-mail (ou 10 por IP) a cada 15 min
// Alertas de segurança vão para developer_alerts no 3º e no 5º erro de senha.
// E-mail e IP são gravados só em hash SHA-256.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { descreverAparelho, ehAcessoNovo } from './acessos.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const anon = () => createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });

// O link do e-mail sempre volta para o domínio da marca.
const DESTINO_RESET = 'https://ecomperegrinus.com.br/reset-password';
const LOGIN_JANELA_MIN = 30, LOGIN_ALERTA = 3, LOGIN_BLOQUEIO = 5;
const RESET_JANELA_MIN = 15, RESET_POR_EMAIL = 3, RESET_POR_IP = 10;

const Corpo = z.discriminatedUnion('acao', [
  z.object({ acao: z.literal('login'), email: z.string().trim().email().max(255), senha: z.string().min(1).max(200) }),
  z.object({ acao: z.literal('reset'), email: z.string().trim().email().max(255) }),
]);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function hash(v: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function tentativas(tipo: string, chave: string, minutos: number) {
  const desde = new Date(Date.now() - minutos * 60_000).toISOString();
  const { data } = await admin.from('auth_tentativas').select('criado_em')
    .eq('tipo', tipo).eq('chave', chave).gte('criado_em', desde).order('criado_em', { ascending: true }).limit(50);
  return data ?? [];
}

function minutosRestantes(maisAntiga: string, janela: number) {
  return Math.max(1, Math.ceil((new Date(maisAntiga).getTime() + janela * 60_000 - Date.now()) / 60_000));
}

async function alertar(codigo: string, mensagem: string) {
  await admin.from('developer_alerts').insert({ categoria: 'seguranca', origem: 'Acesso ao painel', codigo, mensagem });
}

function mascarar(email: string) {
  const [u, d] = email.split('@');
  return `${u.slice(0, 2)}***@${d}`;
}

async function registrarAcesso(req: Request, userId: string, email: string) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  const aparelho = descreverAparelho(req.headers.get('user-agent'));
  const chave = await hash(userId + '|' + aparelho);
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
  // Guarda por 90 dias (LGPD).
  await admin.from('acessos_login').delete().lt('criado_em', desde);
  const { data: anteriores } = await admin.from('acessos_login').select('aparelho_chave').eq('user_id', userId).gte('criado_em', desde).limit(500);
  const { data: novo } = await admin.from('acessos_login').insert({ user_id: userId, ip, aparelho, aparelho_chave: chave }).select('id').single();
  if (!ehAcessoNovo((anteriores ?? []).map((r) => r.aparelho_chave), chave)) return;
  await alertar('acesso_novo', `Acesso de aparelho novo para ${mascarar(email)}: ${aparelho}.`);
  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  await sendTemplateEmail('novo-acesso', email, { templateData: { quando, aparelho, ip: ip ?? undefined }, idempotencyKey: `novo-acesso-${novo?.id ?? chave}` });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'metodo' }, 405);
  let corpo: unknown;
  try { corpo = await req.json(); } catch { return json({ error: 'corpo' }, 400); }
  const p = Corpo.safeParse(corpo);
  if (!p.success) return json({ error: 'dados' }, 400);

  const email = p.data.email.toLowerCase();
  const chaveEmail = await hash(email);
  // Limpeza oportunista: guarda no máximo 1 dia.
  void admin.from('auth_tentativas').delete().lt('criado_em', new Date(Date.now() - 86_400_000).toISOString());

  if (p.data.acao === 'login') {
    const falhas = await tentativas('login_falha', chaveEmail, LOGIN_JANELA_MIN);
    if (falhas.length >= LOGIN_BLOQUEIO) {
      return json({ error: 'bloqueado', minutos: minutosRestantes(falhas[falhas.length - LOGIN_BLOQUEIO].criado_em, LOGIN_JANELA_MIN) }, 429);
    }
    const { data, error } = await anon().auth.signInWithPassword({ email, password: p.data.senha });
    if (error || !data.session) {
      await admin.from('auth_tentativas').insert({ tipo: 'login_falha', chave: chaveEmail });
      const total = falhas.length + 1;
      if (total === LOGIN_ALERTA) await alertar('login_erros', `3 erros de senha seguidos para ${mascarar(email)}.`);
      if (total === LOGIN_BLOQUEIO) {
        await alertar('login_bloqueado', `${mascarar(email)} bloqueado por 30 minutos após 5 erros de senha.`);
        return json({ error: 'bloqueado', minutos: LOGIN_JANELA_MIN }, 429);
      }
      return json({ error: 'credenciais', restantes: LOGIN_BLOQUEIO - total }, 401);
    }
    await admin.from('auth_tentativas').delete().eq('tipo', 'login_falha').eq('chave', chaveEmail);
    try { await registrarAcesso(req, data.user.id, email); } catch (e) { console.warn('registro de acesso falhou', (e as Error).message); }
    return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido';
  const chaveIp = 'ip:' + await hash(ip);
  const [porEmail, porIp] = await Promise.all([
    tentativas('reset', chaveEmail, RESET_JANELA_MIN),
    tentativas('reset', chaveIp, RESET_JANELA_MIN),
  ]);
  if (porEmail.length >= RESET_POR_EMAIL || porIp.length >= RESET_POR_IP) {
    const base = porEmail.length >= RESET_POR_EMAIL ? porEmail[porEmail.length - RESET_POR_EMAIL] : porIp[porIp.length - RESET_POR_IP];
    return json({ error: 'limite', minutos: minutosRestantes(base.criado_em, RESET_JANELA_MIN) }, 429);
  }
  await admin.from('auth_tentativas').insert([{ tipo: 'reset', chave: chaveEmail }, { tipo: 'reset', chave: chaveIp }]);
  const { error } = await anon().auth.resetPasswordForEmail(email, { redirectTo: DESTINO_RESET });
  if (error) console.warn('reset falhou', error.status);
  return json({ ok: true });
});
