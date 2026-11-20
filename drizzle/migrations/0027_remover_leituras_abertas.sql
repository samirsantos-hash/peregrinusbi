DROP POLICY IF EXISTS config_estimativa_read ON public.config_estimativa;
DROP POLICY IF EXISTS gm_conc_read ON public.gm_concessionarias;
DROP POLICY IF EXISTS fonte_leitura ON public.multilojas_fonte;
DROP POLICY IF EXISTS benchmark_uplift_full_read ON public.benchmark_uplift_full;
DROP POLICY IF EXISTS catalogo_leitura ON public.permissao_catalogo;
CREATE POLICY catalogo_leitura ON public.permissao_catalogo FOR SELECT TO authenticated USING ((SELECT public.is_super_admin()));