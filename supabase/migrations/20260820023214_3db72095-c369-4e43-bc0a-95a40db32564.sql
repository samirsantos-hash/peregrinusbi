CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.ml_pode_carregar()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.ml_pode_ver_rede()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'gerente')
      OR EXISTS (
        SELECT 1 FROM public.sellers s
        WHERE s.cust_id = ANY (public.get_allowed_cust_ids())
          AND s.nickname ILIKE '%megaju%'
      );
$$;

DROP POLICY IF EXISTS loja_escrita ON public.multilojas_loja;
CREATE POLICY loja_escrita ON public.multilojas_loja FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());