CREATE TABLE public.ml_sync_tema (
  account_id uuid NOT NULL,
  cust_id text NOT NULL,
  tema text NOT NULL,
  dados jsonb,
  erro text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, tema)
);
GRANT SELECT ON public.ml_sync_tema TO authenticated;
GRANT ALL ON public.ml_sync_tema TO service_role;
ALTER TABLE public.ml_sync_tema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pela carteira" ON public.ml_sync_tema FOR SELECT TO authenticated
USING (public.is_admin() OR cust_id = ANY (public.get_allowed_cust_ids()));
CREATE INDEX ml_sync_tema_cust ON public.ml_sync_tema (cust_id);