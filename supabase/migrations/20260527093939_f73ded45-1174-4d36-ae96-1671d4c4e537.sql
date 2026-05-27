
-- 1) user_sessions: restrict policies to authenticated only
DROP POLICY IF EXISTS "admin reads all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "admin updates all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user inserts own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user reads own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user updates own sessions" ON public.user_sessions;

CREATE POLICY "admin reads all sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admin updates all sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "user inserts own sessions" ON public.user_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user reads own sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user updates own sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.user_sessions FROM anon;

-- 2) portfolios: allow assigned user to read
CREATE POLICY "Assigned users can view portfolio" ON public.portfolios
  FOR SELECT TO authenticated USING (assigned_to = auth.uid());

-- 3) Lock down SECURITY DEFINER helper functions: revoke from PUBLIC/anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_allowed_cust_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_allowed_cust_ids() TO authenticated;
