REVOKE ALL ON FUNCTION public.ml_pode_ver_rede() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_pode_ver_rede() TO authenticated, service_role;