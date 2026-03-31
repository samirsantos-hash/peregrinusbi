
ALTER TABLE public.seller_eligibility
  ADD COLUMN IF NOT EXISTS discount_seller_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS campaign_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS media_tsi_diario_7d numeric DEFAULT 0;
