
-- Tabela de sellers (normalizada)
CREATE TABLE public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cust_id TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  cluster_seller TEXT,
  sub_cluster_seller TEXT,
  cus_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela principal de KPIs
CREATE TABLE public.sellers_kpi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tim_month_id INTEGER,
  
  -- Eficiência / GMV
  gmv_lc NUMERIC DEFAULT 0,
  tsi INTEGER DEFAULT 0,
  tgmv_lc NUMERIC DEFAULT 0,
  
  -- Ads / PADS
  inv_pads NUMERIC DEFAULT 0,
  tgmv_lc_pads NUMERIC DEFAULT 0,
  tsi_pads INTEGER DEFAULT 0,
  
  -- Fulfillment / Logística
  f_tgmv_lc NUMERIC DEFAULT 0,
  f_tsi INTEGER DEFAULT 0,
  tgmv_lc_full NUMERIC DEFAULT 0,
  tgmv_lc_flex NUMERIC DEFAULT 0,
  tsi_flex INTEGER DEFAULT 0,
  
  -- Qualidade (Scores)
  score_photo NUMERIC DEFAULT 0,
  score_title NUMERIC DEFAULT 0,
  score_final_full NUMERIC DEFAULT 0,
  score_oferta_final NUMERIC DEFAULT 0,
  score_caracteristica_final NUMERIC DEFAULT 0,
  score_qualidade_final NUMERIC DEFAULT 0,
  score_final_pads NUMERIC DEFAULT 0,
  
  -- Competitividade
  min_price_rival NUMERIC DEFAULT 0,
  visits NUMERIC DEFAULT 0,
  visits_expensive NUMERIC DEFAULT 0,
  visits_match NUMERIC DEFAULT 0,
  visits_cheaper NUMERIC DEFAULT 0,
  
  -- Uplift / Projeção
  uplift_gmv_lc_m1 NUMERIC DEFAULT 0,
  gmv_lc_m1 NUMERIC DEFAULT 0,
  
  -- CDP
  cdp_tgmv_lc NUMERIC DEFAULT 0,
  cdp_tsi INTEGER DEFAULT 0,
  
  -- Reputação
  rep_current_level TEXT,
  rep_claims_rate NUMERIC DEFAULT 0,
  rep_delayed_ht_rate NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(seller_id, data)
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers_kpi ENABLE ROW LEVEL SECURITY;

-- Policies: qualquer usuário autenticado pode ler
CREATE POLICY "Authenticated users can read sellers"
  ON public.sellers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read KPIs"
  ON public.sellers_kpi FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies: service role pode inserir (para importação via edge function)
CREATE POLICY "Service role can insert sellers"
  ON public.sellers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert KPIs"
  ON public.sellers_kpi FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_sellers_kpi_seller_date ON public.sellers_kpi(seller_id, data);
CREATE INDEX idx_sellers_cust_id ON public.sellers(cust_id);
