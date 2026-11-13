CREATE OR REPLACE FUNCTION public.escopo_lojas_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) FROM public.sellers s WHERE public.checklist_escopo_loja(s.cust_id);
$$;
REVOKE ALL ON FUNCTION public.escopo_lojas_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escopo_lojas_ids() TO authenticated;

DO $$
DECLARE p record; q text;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND policyname='checklist_seller_scope' AND tablename<>'sellers' AND tablename NOT LIKE 'ml\_%' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (seller_id = ANY ((SELECT public.escopo_lojas_ids())::uuid[]))', p.policyname, p.tablename);
  END LOOP;
  FOR p IN SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND qual IN ('is_admin()','is_super_admin()') AND tablename NOT LIKE 'ml\_%' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.%s))', p.policyname, p.tablename, p.qual);
  END LOOP;
  FOR p IN SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND qual LIKE '%get_allowed_cust_ids()%' AND qual NOT LIKE '%SELECT get_allowed_cust_ids()%' AND tablename NOT LIKE 'ml\_%' LOOP
    q := replace(p.qual, 'get_allowed_cust_ids()', '((SELECT public.get_allowed_cust_ids())::text[])');
    EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', p.policyname, p.tablename, q);
  END LOOP;
END $$;