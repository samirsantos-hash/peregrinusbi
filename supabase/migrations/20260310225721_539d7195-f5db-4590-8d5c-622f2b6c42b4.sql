
ALTER TABLE public.sellers_kpi
  ADD COLUMN IF NOT EXISTS ll_pictures_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_title_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_tech_specs_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_description_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_price_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_stock_availability_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_free_shipping_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ll_promotions_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sellers_clips_publi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visitas_clips numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS si_clips numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_clips numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tgmv_lc_clips numeric DEFAULT 0;
