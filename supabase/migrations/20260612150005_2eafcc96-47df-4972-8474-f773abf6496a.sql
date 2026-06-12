ALTER TABLE public.cpp_mensal
  ADD COLUMN IF NOT EXISTS tsi_pads numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontuacao_acos numeric,
  ADD COLUMN IF NOT EXISTS pontuacao_tacos numeric,
  ADD COLUMN IF NOT EXISTS pontuacao_pct_dias_com_pads numeric,
  ADD COLUMN IF NOT EXISTS pontuacao_itens_com_ads numeric;