
-- Drop overly permissive INSERT policies
DROP POLICY "Service role can insert sellers" ON public.sellers;
DROP POLICY "Service role can insert KPIs" ON public.sellers_kpi;

-- No public INSERT policies needed - edge function uses service role key which bypasses RLS
