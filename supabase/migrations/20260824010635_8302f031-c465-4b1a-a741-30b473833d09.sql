
CREATE TABLE IF NOT EXISTS public.ml_refresh_locks (
  account_id uuid PRIMARY KEY REFERENCES public.ml_accounts(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ml_refresh_locks TO service_role;
ALTER TABLE public.ml_refresh_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ml_refresh_locks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ml_claim_refresh(p_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  INSERT INTO public.ml_refresh_locks (account_id, locked_at)
  VALUES (p_account_id, now())
  ON CONFLICT (account_id) DO UPDATE
    SET locked_at = now()
    WHERE public.ml_refresh_locks.locked_at < now() - interval '5 minutes'
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.ml_release_refresh(p_account_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ml_refresh_locks WHERE account_id = p_account_id;
$$;

CREATE OR REPLACE FUNCTION public.ml_store_token(
  p_account_id uuid,
  p_access text,
  p_refresh text,
  p_scope text,
  p_expires_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ml_tokens SET is_current = false
   WHERE account_id = p_account_id AND is_current;

  INSERT INTO public.ml_tokens (account_id, access_token, refresh_token, scope, expires_at, is_current)
  VALUES (p_account_id, p_access, p_refresh, p_scope, p_expires_at, true);

  UPDATE public.ml_accounts SET status = 'active'
   WHERE id = p_account_id AND status <> 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_claim_refresh(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ml_release_refresh(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ml_store_token(uuid, text, text, text, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_claim_refresh(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ml_release_refresh(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ml_store_token(uuid, text, text, text, timestamptz) TO service_role;
