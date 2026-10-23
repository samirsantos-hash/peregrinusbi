import { supabase } from '@/integrations/supabase/client';

export type CodigoAviso = 'carregamento_falhou' | 'renderizacao_falhou' | 'atualizacao_falhou' | 'leitura_parcial' | 'resposta_lenta';
export const PERFIS_SISTEMA = [
  { nome: 'Desenvolvedor', escopo: 'Avisos operacionais e segurança', nivel: 0 },
  { nome: 'Super administrador', escopo: 'Configuração geral', nivel: 1 },
  { nome: 'Administrador', escopo: 'Usuários e dados', nivel: 2 },
  { nome: 'Gerente', escopo: 'Carteiras atribuídas', nivel: 3 },
  { nome: 'Consultor', escopo: 'Lojas da carteira', nivel: 4 },
  { nome: 'Dono de grupo / Gestor de loja', escopo: 'Grupos e lojas vinculados', nivel: 4 },
];
export const temPerfilDesenvolvedor = (roles: readonly string[]) => roles.includes('desenvolvedor');
export const consultaLenta = (ms: number) => Number.isFinite(ms) && ms >= 8000;

export function origemAviso(): string {
  const pagina = window.location.pathname.split('/')[1];
  return ['publicidade', 'perguntas', 'anuncios', 'integracoes', 'mercado', 'admin'].includes(pagina) ? pagina : 'painel';
}

// Apenas códigos controlados: nunca envia corpos, mensagens livres, URLs, credenciais ou dados de compradores.
export async function registrarAviso(codigo: CodigoAviso, origem = origemAviso(), duracao?: number) {
  try {
    await supabase.rpc('registrar_aviso_painel', { p_codigo: codigo, p_origem: origem, p_duracao_ms: duracao == null ? undefined : Math.round(duracao) });
  } catch { /* A coleta não pode impedir o fluxo principal. */ }
}