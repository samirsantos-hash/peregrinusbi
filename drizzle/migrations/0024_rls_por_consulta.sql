DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND policyname='checklist_read' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.guard_permissao_tabela(%L, false)))', p.policyname, p.tablename, p.tablename);
  END LOOP;
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND policyname='master_read_scope' AND qual='is_super_admin()' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT public.is_super_admin()))', p.policyname, p.tablename);
  END LOOP;
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND policyname='checklist_seller_scope' AND tablename<>'sellers' AND qual LIKE '%s.id = '||tablename||'.seller_id%' LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (seller_id IN (SELECT s.id FROM public.sellers s WHERE public.checklist_escopo_loja(s.cust_id)))', p.policyname, p.tablename);
  END LOOP;
END $$;