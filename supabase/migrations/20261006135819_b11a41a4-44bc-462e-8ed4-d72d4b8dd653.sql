ALTER TABLE public.sellers_kpi ADD COLUMN IF NOT EXISTS tgmv_orders numeric;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS fecha_in date;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS fecha_out date;