CREATE TABLE public.ml_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  resource text NOT NULL,
  ml_user_id bigint,
  application_id bigint,
  attempts integer,
  enviado_em timestamptz,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  processado boolean NOT NULL DEFAULT false,
  payload jsonb
);
GRANT SELECT ON public.ml_notificacoes TO authenticated;
GRANT ALL ON public.ml_notificacoes TO service_role;
ALTER TABLE public.ml_notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem notificacoes ML" ON public.ml_notificacoes FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX ml_notificacoes_pendentes_idx ON public.ml_notificacoes (processado, recebido_em);
CREATE INDEX ml_notificacoes_user_topic_idx ON public.ml_notificacoes (ml_user_id, topic);