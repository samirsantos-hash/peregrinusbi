
-- Create daily KPI table
CREATE TABLE public.sellers_kpi_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  data date NOT NULL,
  tgmv_lc numeric DEFAULT 0,
  inv_pads numeric DEFAULT 0,
  tsi integer DEFAULT 0,
  gmv_lc numeric DEFAULT 0,
  tgmv_lc_pads numeric DEFAULT 0,
  tsi_pads integer DEFAULT 0,
  f_tgmv_lc numeric DEFAULT 0,
  f_tsi integer DEFAULT 0,
  tgmv_lc_full numeric DEFAULT 0,
  tgmv_lc_flex numeric DEFAULT 0,
  tsi_flex integer DEFAULT 0,
  visits numeric DEFAULT 0,
  visits_expensive numeric DEFAULT 0,
  visits_match numeric DEFAULT 0,
  visits_cheaper numeric DEFAULT 0,
  score_photo numeric DEFAULT 0,
  score_title numeric DEFAULT 0,
  score_oferta_final numeric DEFAULT 0,
  score_caracteristica_final numeric DEFAULT 0,
  score_qualidade_final numeric DEFAULT 0,
  score_final_full numeric DEFAULT 0,
  score_final_pads numeric DEFAULT 0,
  min_price_rival numeric DEFAULT 0,
  uplift_gmv_lc_m1 numeric DEFAULT 0,
  gmv_lc_m1 numeric DEFAULT 0,
  cdp_tgmv_lc numeric DEFAULT 0,
  cdp_tsi integer DEFAULT 0,
  rep_current_level text,
  rep_claims_rate numeric DEFAULT 0,
  rep_delayed_ht_rate numeric DEFAULT 0,
  rep_cancellations_rate numeric DEFAULT 0,
  pontuacao_ipi numeric DEFAULT 0,
  pontuacao_ll_gtin numeric DEFAULT 0,
  ll_pictures_score numeric DEFAULT 0,
  ll_title_score numeric DEFAULT 0,
  ll_tech_specs_score numeric DEFAULT 0,
  ll_description_score numeric DEFAULT 0,
  ll_price_score numeric DEFAULT 0,
  ll_stock_availability_score numeric DEFAULT 0,
  ll_free_shipping_score numeric DEFAULT 0,
  ll_promotions_score numeric DEFAULT 0,
  sellers_clips_publi numeric DEFAULT 0,
  visitas_clips numeric DEFAULT 0,
  si_clips numeric DEFAULT 0,
  orders_clips numeric DEFAULT 0,
  tgmv_lc_clips numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, data)
);

-- Enable RLS
ALTER TABLE public.sellers_kpi_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as sellers_kpi)
CREATE POLICY "Admins read all daily KPIs" ON public.sellers_kpi_daily FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed daily KPIs" ON public.sellers_kpi_daily FOR SELECT TO authenticated USING (seller_id IN (SELECT s.id FROM sellers s WHERE s.cust_id = ANY(get_allowed_cust_ids())));
CREATE POLICY "Admins can insert daily KPIs" ON public.sellers_kpi_daily FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update daily KPIs" ON public.sellers_kpi_daily FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete daily KPIs" ON public.sellers_kpi_daily FOR DELETE TO authenticated USING (is_admin());
