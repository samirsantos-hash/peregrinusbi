CREATE OR REPLACE FUNCTION public.escopo_lojas_ids()
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v uuid[];
BEGIN
  -- Mesma regra de checklist_escopo_loja, avaliada uma vez por consulta em vez de por linha.
  IF public.is_super_admin() OR (EXISTS(SELECT 1 FROM usuario_permissao_estado WHERE user_id=auth.uid() AND legado AND revisado_em IS NULL) AND public.has_role(auth.uid(),'admin')) THEN
    SELECT COALESCE(array_agg(id), '{}') INTO v FROM sellers;
  ELSE
    SELECT COALESCE(array_agg(id), '{}') INTO v FROM sellers WHERE cust_id = ANY(public.get_allowed_cust_ids());
  END IF;
  RETURN v;
END $$;
ALTER POLICY checklist_seller_scope ON public.sellers USING (id = ANY ((SELECT public.escopo_lojas_ids())::uuid[]));