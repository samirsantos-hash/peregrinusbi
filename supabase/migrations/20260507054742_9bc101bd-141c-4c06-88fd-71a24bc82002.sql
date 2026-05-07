
-- Sessions table
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_seen ON public.user_sessions(last_seen_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- User reads own sessions
CREATE POLICY "user reads own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- User inserts own sessions
CREATE POLICY "user inserts own sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User updates own sessions
CREATE POLICY "user updates own sessions"
  ON public.user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins read all sessions
CREATE POLICY "admin reads all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.is_admin());

-- Admins can update any session (for force-terminate)
CREATE POLICY "admin updates all sessions"
  ON public.user_sessions FOR UPDATE
  USING (public.is_admin());

-- View for admin dashboard
CREATE OR REPLACE VIEW public.vw_usuarios_sessoes AS
SELECT
  p.user_id,
  p.email,
  count(s.id) AS total_sessoes,
  max(s.last_seen_at) AS ultimo_acesso,
  sum(extract(epoch FROM (coalesce(s.logout_at, s.last_seen_at) - s.login_at))) AS segundos_online,
  count(*) FILTER (WHERE s.logout_at IS NULL AND s.last_seen_at > now() - interval '5 minutes') AS sessoes_ativas
FROM public.profiles p
LEFT JOIN public.user_sessions s ON s.user_id = p.user_id
GROUP BY p.user_id, p.email;
