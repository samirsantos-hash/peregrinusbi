
-- Table for eligibility / offer opportunities data
CREATE TABLE public.seller_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text NOT NULL DEFAULT '',
  discount_best numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  flag_item_s_optin boolean DEFAULT false,
  flag_best_promo boolean DEFAULT false,
  acao_recomendada text DEFAULT '',
  estoque_medio_7d numeric DEFAULT 0,
  estoque_medio_full_7d numeric DEFAULT 0,
  pedidos_7d numeric DEFAULT 0,
  vertical_item text DEFAULT '',
  dom_domain_agg1 text DEFAULT '',
  campaign_id_best text DEFAULT '',
  data date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, item_id, data)
);

ALTER TABLE public.seller_eligibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins read all eligibility"
  ON public.seller_eligibility FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Users read allowed eligibility"
  ON public.seller_eligibility FOR SELECT TO authenticated
  USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())));

CREATE POLICY "Admins can insert eligibility"
  ON public.seller_eligibility FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update eligibility"
  ON public.seller_eligibility FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete eligibility"
  ON public.seller_eligibility FOR DELETE TO authenticated
  USING (is_admin());
