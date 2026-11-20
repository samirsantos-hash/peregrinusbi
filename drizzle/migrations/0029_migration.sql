-- Funções de gatilho não devem ser chamadas diretamente por ninguém.
revoke execute on function public.limpar_avisos_desenvolvedor() from public, anon, authenticated;
revoke execute on function public.ml_settings_criar() from public, anon, authenticated;
revoke execute on function public.fill_seller_id_from_cust() from public, anon, authenticated;
-- Lista de contas gerenciáveis: só para quem está logado.
revoke execute on function public.ml_contas_gerenciaveis() from public, anon;
grant execute on function public.ml_contas_gerenciaveis() to authenticated;