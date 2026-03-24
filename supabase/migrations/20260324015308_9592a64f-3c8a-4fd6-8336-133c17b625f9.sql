
CREATE TABLE public.meli_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  cust_id TEXT NOT NULL,
  data DATE NOT NULL,
  vertical_principal TEXT,
  efect_rta_vertical NUMERIC DEFAULT 0,
  taxa_conversao_vertical NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, data, vertical_principal)
);

ALTER TABLE public.meli_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all campaigns" ON public.meli_campaigns FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed campaigns" ON public.meli_campaigns FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())));
CREATE POLICY "Admins can insert campaigns" ON public.meli_campaigns FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update campaigns" ON public.meli_campaigns FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete campaigns" ON public.meli_campaigns FOR DELETE TO authenticated USING (is_admin());
