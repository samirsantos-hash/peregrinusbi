
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- sellers table
DROP POLICY IF EXISTS "Admins read all sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users read allowed sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can insert sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can update sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can delete sellers" ON public.sellers;

CREATE POLICY "Admins read all sellers" ON public.sellers FOR SELECT USING (is_admin());
CREATE POLICY "Users read allowed sellers" ON public.sellers FOR SELECT USING (cust_id = ANY (get_allowed_cust_ids()));
CREATE POLICY "Admins can insert sellers" ON public.sellers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update sellers" ON public.sellers FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete sellers" ON public.sellers FOR DELETE USING (is_admin());

-- sellers_kpi table
DROP POLICY IF EXISTS "Admins read all KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Users read allowed KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can insert KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can update KPIs" ON public.sellers_kpi;
DROP POLICY IF EXISTS "Admins can delete KPIs" ON public.sellers_kpi;

CREATE POLICY "Admins read all KPIs" ON public.sellers_kpi FOR SELECT USING (is_admin());
CREATE POLICY "Users read allowed KPIs" ON public.sellers_kpi FOR SELECT USING (seller_id IN (SELECT id FROM sellers WHERE cust_id = ANY (get_allowed_cust_ids())));
CREATE POLICY "Admins can insert KPIs" ON public.sellers_kpi FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update KPIs" ON public.sellers_kpi FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete KPIs" ON public.sellers_kpi FOR DELETE USING (is_admin());

-- user_access_control table
DROP POLICY IF EXISTS "Admins can manage all access" ON public.user_access_control;
DROP POLICY IF EXISTS "Users can read own access" ON public.user_access_control;

CREATE POLICY "Admins can manage all access" ON public.user_access_control FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own access" ON public.user_access_control FOR SELECT USING (auth.uid() = user_id);

-- user_roles table
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles table
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (is_admin());
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
