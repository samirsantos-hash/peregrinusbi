
REVOKE ALL ON FUNCTION public.ml_pode_carregar() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ml_lojas_do_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_pode_carregar() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_lojas_do_usuario() TO authenticated, service_role;
