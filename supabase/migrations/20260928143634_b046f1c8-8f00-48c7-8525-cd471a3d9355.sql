CREATE TABLE public.ml_convites (
  token text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  criado_por uuid NOT NULL,
  rotulo text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  usado_em timestamptz,
  ml_user_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ml_convites TO service_role;
ALTER TABLE public.ml_convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_oauth_states ADD COLUMN IF NOT EXISTS convite_token text REFERENCES public.ml_convites(token);