ALTER TABLE public.cpp_mensal
  ADD COLUMN IF NOT EXISTS tsi_full     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tsi_me2      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tgmv_lc_flex numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tsi_flex     numeric DEFAULT 0;