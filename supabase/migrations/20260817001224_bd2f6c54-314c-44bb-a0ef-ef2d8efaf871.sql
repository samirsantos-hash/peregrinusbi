CREATE TABLE IF NOT EXISTS public.gm_concessionarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cust_id text NOT NULL,
  status text NOT NULL,
  responsavel text,
  uf text,
  cidade text,
  divisao text NOT NULL CHECK (divisao IN ('Norte','Sul')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gm_conc_cust ON public.gm_concessionarias (cust_id);
GRANT SELECT ON public.gm_concessionarias TO authenticated;
GRANT ALL ON public.gm_concessionarias TO service_role;
ALTER TABLE public.gm_concessionarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gm_conc_read" ON public.gm_concessionarias;
CREATE POLICY "gm_conc_read" ON public.gm_concessionarias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gm_conc_admin" ON public.gm_concessionarias;
CREATE POLICY "gm_conc_admin" ON public.gm_concessionarias FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP TRIGGER IF EXISTS trg_gm_conc_updated ON public.gm_concessionarias;
CREATE TRIGGER trg_gm_conc_updated BEFORE UPDATE ON public.gm_concessionarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();