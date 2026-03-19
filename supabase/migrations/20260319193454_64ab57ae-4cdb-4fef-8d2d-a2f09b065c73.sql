
CREATE TABLE public.seller_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  cust_id text NOT NULL,
  salesforce_url text,
  expiration_date date NOT NULL,
  days_to_expire integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX seller_grants_seller_id_key ON public.seller_grants(seller_id);

ALTER TABLE public.seller_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all grants" ON public.seller_grants FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed grants" ON public.seller_grants FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())));
CREATE POLICY "Admins can insert grants" ON public.seller_grants FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update grants" ON public.seller_grants FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete grants" ON public.seller_grants FOR DELETE TO authenticated USING (is_admin());
