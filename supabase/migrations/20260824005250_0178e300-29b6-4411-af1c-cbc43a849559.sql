REVOKE EXECUTE ON FUNCTION public.get_meus_grupos()            FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_perfil()                 FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()             FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_divergencias(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_feeds_por_mes()    FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_nulos_criticos()   FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_ultimo_import()    FROM public, anon;

GRANT EXECUTE ON FUNCTION public.get_meus_grupos()             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_perfil()                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin()              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qualidade_divergencias(text)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qualidade_feeds_por_mes()     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qualidade_nulos_criticos()    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.qualidade_ultimo_import()     TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public;