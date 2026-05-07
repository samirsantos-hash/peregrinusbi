
-- Fix the view to be SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.vw_usuarios_sessoes;

CREATE VIEW public.vw_usuarios_sessoes 
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.email,
  count(s.id) AS total_sessoes,
  max(s.last_seen_at) AS ultimo_acesso,
  sum(extract(epoch FROM (coalesce(s.logout_at, s.last_seen_at) - s.login_at))) AS segundos_online,
  count(*) FILTER (WHERE s.logout_at IS NULL AND s.last_seen_at > now() - interval '5 minutes') AS sessoes_ativas
FROM public.profiles p
LEFT JOIN public.user_sessions s ON s.user_id = p.user_id
GROUP BY p.user_id, p.email;

-- Revoke anon execution on security definer functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_allowed_cust_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
