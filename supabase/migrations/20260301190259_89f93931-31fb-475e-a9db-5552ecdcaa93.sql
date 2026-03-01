
-- Drop restrictive policies and create permissive ones for public read
DROP POLICY IF EXISTS "Authenticated users can read sellers" ON public.sellers;
DROP POLICY IF EXISTS "Authenticated users can read KPIs" ON public.sellers_kpi;

CREATE POLICY "Allow public read sellers"
  ON public.sellers FOR SELECT
  USING (true);

CREATE POLICY "Allow public read KPIs"
  ON public.sellers_kpi FOR SELECT
  USING (true);
