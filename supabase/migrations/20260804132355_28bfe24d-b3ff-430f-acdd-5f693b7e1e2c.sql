DROP POLICY IF EXISTS "cart_cpp_diarizado read auth" ON public.cart_cpp_diarizado;
DROP POLICY IF EXISTS "cart_cpp_mensal read auth" ON public.cart_cpp_mensal;
DROP POLICY IF EXISTS "cart_cdp_diarizado read auth" ON public.cart_cdp_diarizado;
DROP POLICY IF EXISTS "cart_cdp_mensal read auth" ON public.cart_cdp_mensal;
DROP POLICY IF EXISTS "cart_livelistings read auth" ON public.cart_livelistings;
DROP POLICY IF EXISTS "cart_elegibilidade read auth" ON public.cart_elegibilidade;
DROP POLICY IF EXISTS "cart_base_vendedores read auth" ON public.cart_base_vendedores;

CREATE POLICY "cart_cpp_diarizado scoped read" ON public.cart_cpp_diarizado FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_cpp_mensal scoped read" ON public.cart_cpp_mensal FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_cdp_diarizado scoped read" ON public.cart_cdp_diarizado FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_cdp_mensal scoped read" ON public.cart_cdp_mensal FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_livelistings scoped read" ON public.cart_livelistings FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_elegibilidade scoped read" ON public.cart_elegibilidade FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));

CREATE POLICY "cart_base_vendedores scoped read" ON public.cart_base_vendedores FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id::text = ANY (public.get_allowed_cust_ids()));