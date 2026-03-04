
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE for all tables
-- The issue is that ALL policies were created as RESTRICTIVE, which means
-- access is always denied because PostgreSQL requires at least one PERMISSIVE policy.

-- ============ sellers ============
DROP POLICY IF EXISTS "Admins read all sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users read allowed sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can insert sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can update sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can delete sellers" ON public.sellers;

CREATE POLICY "Admins read all sellers" ON public.sellers FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed sellers" ON public.sellers FOR SELECT TO authenticated USING (cust_id = ANY (get_allowed_cust_ids()));
CREATE POLICY "Admins can insert sellers" ON public.sellers FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update sellers" ON public.sellers FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete sellers" ON public.sellers FOR DELETE TO authenticated USING (is_admin());

-- ============ sellers_kpi ============
DROP POLICY IF EXISTS "Admins read all KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Users read allowed KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can insert KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can update KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can delete KPIs" ON public.sellers_kpi;

CREATE POLICY "Admins read all KPIs" ON public.sellers_kpi FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed KPIs" ON public.sellers_kpi FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY (get_allowed_cust_ids())));
CREATE POLICY "Admins can insert KPIs" ON public.sellers_kpi FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update KPIs" ON public.sellers_kpi FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete KPIs" ON public.sellers_kpi FOR DELETE TO authenticated USING (is_admin());

-- ============ live_listings ============
DROP POLICY IF EXISTS "Admins read all live_listings" ON public.live_listings;
DROP POLICY IF EXISTS "Users read allowed live_listings" ON public.live_listings;
DROP POLICY IF EXISTS "Admins can insert live_listings" ON public.live_listings;
DROP POLICY IF EXISTS "Admins can update live_listings" ON public.live_listings;
DROP POLICY IF EXISTS "Admins can delete live_listings" ON public.live_listings;

CREATE POLICY "Admins read all live_listings" ON public.live_listings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed live_listings" ON public.live_listings FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY (get_allowed_cust_ids())));
CREATE POLICY "Admins can insert live_listings" ON public.live_listings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update live_listings" ON public.live_listings FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete live_listings" ON public.live_listings FOR DELETE TO authenticated USING (is_admin());

-- ============ profiles ============
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ upload_logs ============
DROP POLICY IF EXISTS "Admins can manage upload_logs" ON public.upload_logs;
CREATE POLICY "Admins can manage upload_logs" ON public.upload_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============ user_access_control ============
DROP POLICY IF EXISTS "Admins can manage all access" ON public.user_access_control;
DROP POLICY IF EXISTS "Users can read own access" ON public.user_access_control;

CREATE POLICY "Admins can manage all access" ON public.user_access_control FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own access" ON public.user_access_control FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ user_roles ============
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
