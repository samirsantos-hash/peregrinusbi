CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- grava/atualiza o segredo no Vault (chamada apenas por service_role, via edge function)
CREATE OR REPLACE FUNCTION public.ml_set_trigger_secret(p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'REFRESH_TRIGGER_SECRET';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, 'REFRESH_TRIGGER_SECRET', 'Segredo de disparo do cron ml-token-refresh');
  ELSE
    PERFORM vault.update_secret(v_id, p_value);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_set_trigger_secret(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_set_trigger_secret(text) TO service_role;

-- executa a chamada agendada lendo o segredo do Vault em tempo de execução
CREATE OR REPLACE FUNCTION public.ml_cron_refresh_tokens(p_url text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_req_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'REFRESH_TRIGGER_SECRET'
   LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'REFRESH_TRIGGER_SECRET ausente no Vault';
  END IF;

  SELECT net.http_post(
    url := p_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-refresh-secret', v_secret
    ),
    body := jsonb_build_object('source', 'pg_cron', 'at', now())
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_cron_refresh_tokens(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_cron_refresh_tokens(text) TO service_role;