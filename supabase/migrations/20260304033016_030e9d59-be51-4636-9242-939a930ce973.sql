
-- Table: live_listings (inventory/catalog data)
CREATE TABLE public.live_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  data date NOT NULL,
  categoria text,
  itens integer DEFAULT 0,
  vertical text,
  dom_domain_agg1 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, data, categoria)
);

ALTER TABLE public.live_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_listings
CREATE POLICY "Admins read all live_listings" ON public.live_listings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed live_listings" ON public.live_listings FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())));
CREATE POLICY "Admins can insert live_listings" ON public.live_listings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update live_listings" ON public.live_listings FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete live_listings" ON public.live_listings FOR DELETE TO authenticated USING (is_admin());

-- Table: upload_logs
CREATE TABLE public.upload_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL,
  upload_type text NOT NULL CHECK (upload_type IN ('cpp_mensal', 'live_listings')),
  rows_imported integer NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage upload_logs" ON public.upload_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Add pontuacao_ipi to sellers_kpi
ALTER TABLE public.sellers_kpi ADD COLUMN IF NOT EXISTS pontuacao_ipi numeric DEFAULT 0;
