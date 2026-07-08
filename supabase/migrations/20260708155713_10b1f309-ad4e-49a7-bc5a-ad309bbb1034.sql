DROP POLICY "user updates own sessions" ON public.user_sessions;
CREATE POLICY "user updates own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY "admin updates all sessions" ON public.user_sessions;
CREATE POLICY "admin updates all sessions" ON public.user_sessions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());