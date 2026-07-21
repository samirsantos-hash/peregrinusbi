
-- Trigger genérico updated_at (reutilizado)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- 1. cart_cpp_diarizado
CREATE TABLE public.cart_cpp_diarizado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE,
  date_id INTEGER,
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  gmv NUMERIC,
  f_gmv NUMERIC,
  tsi NUMERIC,
  f_tsi NUMERIC,
  visitas NUMERIC,
  total_livelistings NUMERIC,
  sub_cluster_seller TEXT,
  nivel_solucion TEXT,
  localidade TEXT,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_cpp_diarizado TO authenticated;
GRANT ALL ON public.cart_cpp_diarizado TO service_role;
ALTER TABLE public.cart_cpp_diarizado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_cpp_diarizado read auth" ON public.cart_cpp_diarizado FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_cpp_d_cust ON public.cart_cpp_diarizado(cust_id);
CREATE INDEX idx_cart_cpp_d_data ON public.cart_cpp_diarizado(data);
CREATE TRIGGER trg_cart_cpp_d_upd BEFORE UPDATE ON public.cart_cpp_diarizado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. cart_cpp_mensal
CREATE TABLE public.cart_cpp_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tim_month_id INTEGER,
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  cus_state TEXT,
  visitas NUMERIC,
  tsi NUMERIC,
  tgmv_lc NUMERIC,
  tgmv_lc_full NUMERIC,
  tgmv_lc_flex NUMERIC,
  tgmv_lc_fbm NUMERIC,
  tgmv_lc_pads NUMERIC,
  tsi_pads NUMERIC,
  inv_pads NUMERIC,
  sellers_invest_pads NUMERIC,
  rep_current_level TEXT,
  rep_claims_rate NUMERIC,
  rep_disputes_rate NUMERIC,
  score_final_full NUMERIC,
  score_final_bbf NUMERIC,
  bpc NUMERIC,
  sub_cluster_seller TEXT,
  nivel_solucion TEXT,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_cpp_mensal TO authenticated;
GRANT ALL ON public.cart_cpp_mensal TO service_role;
ALTER TABLE public.cart_cpp_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_cpp_mensal read auth" ON public.cart_cpp_mensal FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_cpp_m_cust ON public.cart_cpp_mensal(cust_id);
CREATE INDEX idx_cart_cpp_m_mes ON public.cart_cpp_mensal(tim_month_id);
CREATE TRIGGER trg_cart_cpp_m_upd BEFORE UPDATE ON public.cart_cpp_mensal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. cart_cdp_diarizado
CREATE TABLE public.cart_cdp_diarizado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE,
  date_id INTEGER,
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  cp_investments_lc NUMERIC,
  cp_investiments_seller_lc NUMERIC,
  total_rebates_lc NUMERIC,
  total_investiments_lc NUMERIC,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_cdp_diarizado TO authenticated;
GRANT ALL ON public.cart_cdp_diarizado TO service_role;
ALTER TABLE public.cart_cdp_diarizado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_cdp_diarizado read auth" ON public.cart_cdp_diarizado FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_cdp_d_cust ON public.cart_cdp_diarizado(cust_id);
CREATE INDEX idx_cart_cdp_d_data ON public.cart_cdp_diarizado(data);
CREATE TRIGGER trg_cart_cdp_d_upd BEFORE UPDATE ON public.cart_cdp_diarizado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. cart_cdp_mensal
CREATE TABLE public.cart_cdp_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tim_month_id INTEGER,
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  cp_investments_lc NUMERIC,
  cp_investiments_seller_lc NUMERIC,
  total_rebates_lc NUMERIC,
  total_investiments_lc NUMERIC,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_cdp_mensal TO authenticated;
GRANT ALL ON public.cart_cdp_mensal TO service_role;
ALTER TABLE public.cart_cdp_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_cdp_mensal read auth" ON public.cart_cdp_mensal FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_cdp_m_cust ON public.cart_cdp_mensal(cust_id);
CREATE INDEX idx_cart_cdp_m_mes ON public.cart_cdp_mensal(tim_month_id);
CREATE TRIGGER trg_cart_cdp_m_upd BEFORE UPDATE ON public.cart_cdp_mensal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. cart_livelistings
CREATE TABLE public.cart_livelistings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tim_month_id INTEGER,
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  cus_state TEXT,
  item_id TEXT,
  item_name TEXT,
  vertical TEXT,
  vertical_item TEXT,
  categoria TEXT,
  dom_domain_agg1 TEXT,
  dom_domain_agg2 TEXT,
  dom_domain_agg3 TEXT,
  itens NUMERIC,
  sub_cluster_seller TEXT,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_livelistings TO authenticated;
GRANT ALL ON public.cart_livelistings TO service_role;
ALTER TABLE public.cart_livelistings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_livelistings read auth" ON public.cart_livelistings FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_ll_cust ON public.cart_livelistings(cust_id);
CREATE INDEX idx_cart_ll_item ON public.cart_livelistings(item_id);
CREATE INDEX idx_cart_ll_uf ON public.cart_livelistings(cus_state);
CREATE INDEX idx_cart_ll_mes ON public.cart_livelistings(tim_month_id);
CREATE TRIGGER trg_cart_ll_upd BEFORE UPDATE ON public.cart_livelistings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. cart_elegibilidade
CREATE TABLE public.cart_elegibilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  item_id TEXT,
  item_name TEXT,
  vertical TEXT,
  campaign_id TEXT,
  campaign_id_best TEXT,
  campaign_type TEXT,
  discount_seller_percentage NUMERIC,
  discount_total NUMERIC,
  discount_best NUMERIC,
  flag_item_s_optin BOOLEAN,
  flag_seller_s_optin BOOLEAN,
  flag_best_promo BOOLEAN,
  pedidos_7d NUMERIC,
  media_tsi_diario_7d NUMERIC,
  acao_recomendada TEXT,
  data_atualizacao TIMESTAMPTZ,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_elegibilidade TO authenticated;
GRANT ALL ON public.cart_elegibilidade TO service_role;
ALTER TABLE public.cart_elegibilidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_elegibilidade read auth" ON public.cart_elegibilidade FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_eleg_cust ON public.cart_elegibilidade(cust_id);
CREATE INDEX idx_cart_eleg_item ON public.cart_elegibilidade(item_id);
CREATE TRIGGER trg_cart_eleg_upd BEFORE UPDATE ON public.cart_elegibilidade FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. cart_base_vendedores
CREATE TABLE public.cart_base_vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cust_id BIGINT NOT NULL,
  cus_nickname TEXT,
  cus_state TEXT,
  nivel_solucion TEXT,
  fecha_in DATE,
  fecha_out DATE,
  source_file TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cart_base_vendedores TO authenticated;
GRANT ALL ON public.cart_base_vendedores TO service_role;
ALTER TABLE public.cart_base_vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_base_vendedores read auth" ON public.cart_base_vendedores FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_cart_bv_cust ON public.cart_base_vendedores(cust_id);
CREATE INDEX idx_cart_bv_out ON public.cart_base_vendedores(fecha_out);
CREATE TRIGGER trg_cart_bv_upd BEFORE UPDATE ON public.cart_base_vendedores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
