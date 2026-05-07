
-- 1) Sellers do mês anterior (snapshot mensal)
CREATE TABLE public.sellers_pm (
  cust_id bigint NOT NULL,
  seller_url text,
  vs_pm_status text,
  nmv_usd numeric DEFAULT 0, nmv_lc numeric DEFAULT 0,
  nmv_lc_1 numeric DEFAULT 0, nmv_lc_2 numeric DEFAULT 0,
  sb numeric DEFAULT 0, vs_pm_pct numeric DEFAULT 0,
  penetracao_3pgm_pct numeric DEFAULT 0, vs_pm_3pgm_pct numeric DEFAULT 0,
  data_ultima_concessao date,
  data_expiracao_concessao date,
  dias_expiracao integer DEFAULT 0,
  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cust_id, snapshot_date)
);
ALTER TABLE public.sellers_pm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all sellers_pm" ON public.sellers_pm FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed sellers_pm" ON public.sellers_pm FOR SELECT TO authenticated USING (cust_id::text = ANY(get_allowed_cust_ids()));
CREATE POLICY "Admins insert sellers_pm" ON public.sellers_pm FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update sellers_pm" ON public.sellers_pm FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins delete sellers_pm" ON public.sellers_pm FOR DELETE TO authenticated USING (is_admin());

-- 2) CPP mensal
CREATE TABLE public.cpp_mensal (
  cus_cust_id_sel bigint NOT NULL,
  tim_month_id integer NOT NULL,
  mes_ref date GENERATED ALWAYS AS (make_date((tim_month_id/100)::int, (tim_month_id%100)::int, 1)) STORED,
  cus_nickname text,
  cluster_seller text, sub_cluster_seller text,
  cus_state text, h_l text, nivel_solucion text,
  fecha_in date, fecha_out date,
  programa text, iniciativa text, nombre_solucion text,
  meses_no_programa integer DEFAULT 0,
  comparativo text,
  tgmv_lc numeric DEFAULT 0, tsi numeric DEFAULT 0,
  f_tgmv_lc numeric DEFAULT 0, f_tsi numeric DEFAULT 0,
  tgmv_lc_fbm numeric DEFAULT 0, tgmv_lc_me2 numeric DEFAULT 0,
  inv_pads numeric DEFAULT 0, tgmv_lc_pads numeric DEFAULT 0,
  cdp_tgmv_lc numeric DEFAULT 0, cdp_tsi numeric DEFAULT 0,
  score_final_full numeric DEFAULT 0, score_final_cdp numeric DEFAULT 0,
  score_final_pads numeric DEFAULT 0, score_final_servicos numeric DEFAULT 0,
  score_final_bbf numeric DEFAULT 0,
  pontuacao_ipi numeric DEFAULT 0, pontuacao_hi numeric DEFAULT 0, pontuacao_sow numeric DEFAULT 0,
  rep_current_level text, rep_claims_rate numeric DEFAULT 0,
  visitas numeric DEFAULT 0, total_livelistings numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cus_cust_id_sel, tim_month_id)
);
CREATE INDEX idx_cpp_mensal_mes ON public.cpp_mensal(mes_ref);
CREATE INDEX idx_cpp_mensal_cluster ON public.cpp_mensal(cluster_seller);
ALTER TABLE public.cpp_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all cpp_mensal" ON public.cpp_mensal FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed cpp_mensal" ON public.cpp_mensal FOR SELECT TO authenticated USING (cus_cust_id_sel::text = ANY(get_allowed_cust_ids()));
CREATE POLICY "Admins insert cpp_mensal" ON public.cpp_mensal FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update cpp_mensal" ON public.cpp_mensal FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins delete cpp_mensal" ON public.cpp_mensal FOR DELETE TO authenticated USING (is_admin());

-- 3) CDP mensal
CREATE TABLE public.cdp_mensal (
  cus_cust_id_sel bigint NOT NULL,
  tim_month_id integer NOT NULL,
  programa text NOT NULL DEFAULT '',
  nombre_solucion text,
  safra date,
  meses_no_programa integer DEFAULT 0,
  f_tgmv_lc numeric DEFAULT 0,
  f_tgmv_lc_pre_acordo numeric DEFAULT 0, f_tgmv_lc_automatic numeric DEFAULT 0,
  f_tgmv_lc_custom_seller numeric DEFAULT 0, f_tgmv_lc_tiers numeric DEFAULT 0,
  f_tgmv_lc_regular numeric DEFAULT 0, f_tgmv_lc_cupom numeric DEFAULT 0,
  f_tgmv_lc_dxb numeric DEFAULT 0, f_tgmv_lc_dod numeric DEFAULT 0,
  f_tgmv_lc_lightning numeric DEFAULT 0, f_tgmv_lc_cdp numeric DEFAULT 0,
  cp_investments_lc numeric DEFAULT 0, cp_investiments_seller_lc numeric DEFAULT 0,
  total_rebates_lc numeric DEFAULT 0, total_investiments_lc numeric DEFAULT 0,
  dt_atualizacao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cus_cust_id_sel, tim_month_id, programa)
);
ALTER TABLE public.cdp_mensal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all cdp_mensal" ON public.cdp_mensal FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed cdp_mensal" ON public.cdp_mensal FOR SELECT TO authenticated USING (cus_cust_id_sel::text = ANY(get_allowed_cust_ids()));
CREATE POLICY "Admins insert cdp_mensal" ON public.cdp_mensal FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update cdp_mensal" ON public.cdp_mensal FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins delete cdp_mensal" ON public.cdp_mensal FOR DELETE TO authenticated USING (is_admin());

-- 4) GM Live listings (separate from existing live_listings)
CREATE TABLE public.gm_live_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date,
  cus_cust_id_sel bigint,
  cus_nickname text,
  tim_month_id integer,
  programa text, iniciativa text,
  nivel_solucion text, cluster_seller text, sub_cluster_seller text,
  cus_state text, h_l text,
  vertical text, dom_domain_agg1 text, dom_domain_agg2 text, dom_domain_agg3 text,
  categoria text, itens integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gm_ll_seller ON public.gm_live_listings(cus_cust_id_sel);
ALTER TABLE public.gm_live_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all gm_live_listings" ON public.gm_live_listings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed gm_live_listings" ON public.gm_live_listings FOR SELECT TO authenticated USING (cus_cust_id_sel::text = ANY(get_allowed_cust_ids()));
CREATE POLICY "Admins insert gm_live_listings" ON public.gm_live_listings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update gm_live_listings" ON public.gm_live_listings FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins delete gm_live_listings" ON public.gm_live_listings FOR DELETE TO authenticated USING (is_admin());

-- 5) Elegibilidade
CREATE TABLE public.gm_elegibilidade (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cus_cust_id_sel bigint,
  cus_nickname text,
  flag_seller_optin boolean DEFAULT false,
  flag_item_optin boolean DEFAULT false,
  programa text, nombre_solucion text,
  safra date, meses_no_programa integer DEFAULT 0,
  acao_recomendada text, flag_best_promo boolean DEFAULT false,
  campaign_id text, campaign_type text,
  campaign_created_dt date, campaign_finished_dt date,
  item_id bigint, vertical_item text, item_name text,
  discount_seller_percentage numeric DEFAULT 0, discount_total numeric DEFAULT 0,
  pedidos_7d numeric DEFAULT 0, media_tsi_diario_7d numeric DEFAULT 0,
  estoque_medio_7d numeric DEFAULT 0, estoque_medio_full_7d numeric DEFAULT 0,
  data_atualizacao date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gm_eleg_seller ON public.gm_elegibilidade(cus_cust_id_sel);
ALTER TABLE public.gm_elegibilidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all gm_elegibilidade" ON public.gm_elegibilidade FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users read allowed gm_elegibilidade" ON public.gm_elegibilidade FOR SELECT TO authenticated USING (cus_cust_id_sel::text = ANY(get_allowed_cust_ids()));
CREATE POLICY "Admins insert gm_elegibilidade" ON public.gm_elegibilidade FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update gm_elegibilidade" ON public.gm_elegibilidade FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins delete gm_elegibilidade" ON public.gm_elegibilidade FOR DELETE TO authenticated USING (is_admin());

-- 6) Ingest log
CREATE TABLE public.ingest_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  file text NOT NULL,
  rows_in integer DEFAULT 0,
  rows_upserted integer DEFAULT 0,
  errors_json jsonb DEFAULT '[]'::jsonb,
  uploaded_by uuid
);
ALTER TABLE public.ingest_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ingest_log" ON public.ingest_log FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
