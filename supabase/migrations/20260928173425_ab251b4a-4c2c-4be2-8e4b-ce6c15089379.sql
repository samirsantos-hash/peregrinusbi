CREATE TABLE public.alerta_inatividade_destinatarios (
  email_prefixo text PRIMARY KEY
);
GRANT ALL ON public.alerta_inatividade_destinatarios TO service_role;
ALTER TABLE public.alerta_inatividade_destinatarios ENABLE ROW LEVEL SECURITY;
INSERT INTO public.alerta_inatividade_destinatarios VALUES ('samir'),('fabricio'),('ana'),('navalhei');

CREATE TABLE public.alerta_inatividade_ciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id uuid NOT NULL,
  usuario_inativo_id uuid NOT NULL,
  ultimo_acesso timestamptz,
  ciente_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destinatario_id, usuario_inativo_id, ultimo_acesso)
);
GRANT SELECT, INSERT ON public.alerta_inatividade_ciente TO authenticated;
GRANT ALL ON public.alerta_inatividade_ciente TO service_role;
ALTER TABLE public.alerta_inatividade_ciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own acks select" ON public.alerta_inatividade_ciente FOR SELECT TO authenticated USING (destinatario_id = auth.uid());
CREATE POLICY "own acks insert" ON public.alerta_inatividade_ciente FOR INSERT TO authenticated WITH CHECK (destinatario_id = auth.uid());

CREATE OR REPLACE FUNCTION public.alertas_inatividade_pendentes()
RETURNS TABLE(user_id uuid, email text, ultimo_acesso timestamptz, dias integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (SELECT email FROM auth.users WHERE id = auth.uid()),
  ok AS (
    SELECT 1 FROM me, alerta_inatividade_destinatarios d
    WHERE split_part(lower(me.email),'@',1) LIKE lower(d.email_prefixo) || '%'
  ),
  u AS (
    SELECT p.user_id, p.email, max(s.last_seen_at) AS ult
    FROM profiles p LEFT JOIN user_sessions s ON s.user_id = p.user_id
    GROUP BY p.user_id, p.email
  )
  SELECT u.user_id, u.email, u.ult,
         floor(extract(epoch FROM now() - u.ult)/86400)::int
  FROM u
  WHERE EXISTS (SELECT 1 FROM ok)
    AND u.ult IS NOT NULL
    AND u.ult < now() - interval '3 days'
    AND u.user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM alerta_inatividade_ciente c
      WHERE c.destinatario_id = auth.uid() AND c.usuario_inativo_id = u.user_id
        AND c.ultimo_acesso = u.ult
    )
  ORDER BY u.ult;
$$;
GRANT EXECUTE ON FUNCTION public.alertas_inatividade_pendentes() TO authenticated;