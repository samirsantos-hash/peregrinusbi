CREATE INDEX IF NOT EXISTS idx_skd_seller_data ON public.sellers_kpi_daily (seller_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_se_seller_data ON public.seller_eligibility (seller_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_uac_user ON public.user_access_control (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_assigned ON public.portfolios (assigned_to);
ANALYZE public.seller_eligibility;
ANALYZE public.sellers_kpi_daily;