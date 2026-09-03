DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', r.tbl);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

DROP POLICY IF EXISTS "Users see their own notifications" ON public.portfolio_notifications;
CREATE POLICY "Users see their own notifications" ON public.portfolio_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own notifications" ON public.portfolio_notifications;
CREATE POLICY "Users update their own notifications" ON public.portfolio_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their own notifications" ON public.portfolio_notifications;
CREATE POLICY "Users delete their own notifications" ON public.portfolio_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin updates all sessions" ON public.user_sessions;
CREATE POLICY "admin updates all sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user updates own sessions" ON public.user_sessions;
CREATE POLICY "user updates own sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);