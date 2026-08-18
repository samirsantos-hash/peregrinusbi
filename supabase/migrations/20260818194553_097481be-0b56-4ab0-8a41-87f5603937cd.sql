CREATE TABLE public.metas_loja (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  mes text NOT NULL,
  meta_faturamento numeric,
  meta_clips numeric,
  meta_reposicao numeric,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, mes)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_loja TO authenticated;
GRANT ALL ON public.metas_loja TO service_role;

ALTER TABLE public.metas_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all metas" ON public.metas_loja FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users read metas of allowed sellers" ON public.metas_loja FOR SELECT TO authenticated
USING (seller_id IN (SELECT s.id FROM public.sellers s WHERE s.cust_id = ANY (public.get_allowed_cust_ids())));

CREATE POLICY "Users insert metas of allowed sellers" ON public.metas_loja FOR INSERT TO authenticated
WITH CHECK (seller_id IN (SELECT s.id FROM public.sellers s WHERE s.cust_id = ANY (public.get_allowed_cust_ids())));

CREATE POLICY "Users update metas of allowed sellers" ON public.metas_loja FOR UPDATE TO authenticated
USING (seller_id IN (SELECT s.id FROM public.sellers s WHERE s.cust_id = ANY (public.get_allowed_cust_ids())))
WITH CHECK (seller_id IN (SELECT s.id FROM public.sellers s WHERE s.cust_id = ANY (public.get_allowed_cust_ids())));

CREATE POLICY "Users delete metas of allowed sellers" ON public.metas_loja FOR DELETE TO authenticated
USING (seller_id IN (SELECT s.id FROM public.sellers s WHERE s.cust_id = ANY (public.get_allowed_cust_ids())));

CREATE TRIGGER trg_metas_loja_upd BEFORE UPDATE ON public.metas_loja
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_metas_loja_seller_mes ON public.metas_loja (seller_id, mes);