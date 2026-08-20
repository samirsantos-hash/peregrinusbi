CREATE OR REPLACE FUNCTION public.ml_pode_ver_rede()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.ml_pode_carregar()
      OR EXISTS (
        SELECT 1 FROM public.sellers s
        WHERE s.cust_id = ANY (public.get_allowed_cust_ids())
          AND s.nickname ILIKE '%megaju%'
      );
$$;

DROP POLICY IF EXISTS pedido_leitura ON public.multilojas_pedido;
CREATE POLICY pedido_leitura ON public.multilojas_pedido
FOR SELECT TO authenticated
USING (
  public.ml_pode_ver_rede()
  OR (public.has_role(auth.uid(), 'gestor_loja'::app_role) AND loja_id IN (SELECT public.ml_lojas_do_usuario()))
);

DROP POLICY IF EXISTS carga_leitura ON public.multilojas_carga;
CREATE POLICY carga_leitura ON public.multilojas_carga
FOR SELECT TO authenticated
USING (public.ml_pode_ver_rede());