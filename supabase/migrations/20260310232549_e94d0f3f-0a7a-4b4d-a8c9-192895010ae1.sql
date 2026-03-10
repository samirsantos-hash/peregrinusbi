
-- Table for per-listing quality data with MLB IDs
CREATE TABLE public.seller_listings_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  data date NOT NULL,
  -- LL Técnico scores
  ll_pictures_score numeric DEFAULT 0,
  ll_title_score numeric DEFAULT 0,
  ll_tech_specs_score numeric DEFAULT 0,
  ll_description_score numeric DEFAULT 0,
  -- LL Oferta scores
  ll_price_score numeric DEFAULT 0,
  ll_stock_availability_score numeric DEFAULT 0,
  ll_free_shipping_score numeric DEFAULT 0,
  ll_promotions_score numeric DEFAULT 0,
  -- Legacy scores
  score_photo numeric DEFAULT 0,
  score_title numeric DEFAULT 0,
  score_oferta_final numeric DEFAULT 0,
  score_caracteristica_final numeric DEFAULT 0,
  score_qualidade_final numeric DEFAULT 0,
  -- Clips
  sellers_clips_publi numeric DEFAULT 0,
  visitas_clips numeric DEFAULT 0,
  si_clips numeric DEFAULT 0,
  orders_clips numeric DEFAULT 0,
  tgmv_lc_clips numeric DEFAULT 0,
  -- Meta
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, item_id, data)
);

-- RLS
ALTER TABLE public.seller_listings_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all listings quality"
  ON public.seller_listings_quality FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Users read allowed listings quality"
  ON public.seller_listings_quality FOR SELECT TO authenticated
  USING (seller_id IN (
    SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())
  ));

CREATE POLICY "Admins can insert listings quality"
  ON public.seller_listings_quality FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update listings quality"
  ON public.seller_listings_quality FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete listings quality"
  ON public.seller_listings_quality FOR DELETE TO authenticated
  USING (is_admin());
