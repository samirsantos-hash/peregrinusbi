CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT auth.uid() = ANY(ARRAY['fd93c492-0d67-47ff-b52d-b3ea2b61f041'::uuid,'c41be23f-bd64-4515-87f5-827f67f67927'::uuid,'81efb362-7cd2-4a55-b095-33056d5c6231'::uuid,'6f9fe5b3-2ba9-457b-8a3e-9599a5ddda2e'::uuid]) AND public.has_role(auth.uid(),'super_admin');
$$;
CREATE OR REPLACE FUNCTION public.proteger_categoria_master()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
IF current_user IN ('authenticated','anon') AND NOT public.is_super_admin() THEN RAISE EXCEPTION 'Somente master altera categorias' USING ERRCODE='42501'; END IF;
IF (CASE WHEN TG_OP='DELETE' THEN OLD.role='super_admin' WHEN TG_OP='UPDATE' THEN NEW.role='super_admin' OR OLD.role='super_admin' ELSE NEW.role='super_admin' END) THEN
IF current_user IN ('authenticated','anon') THEN RAISE EXCEPTION 'Categoria master reservada' USING ERRCODE='42501'; END IF;
IF TG_OP<>'DELETE' AND NEW.role='super_admin' AND NOT NEW.user_id=ANY(ARRAY['fd93c492-0d67-47ff-b52d-b3ea2b61f041'::uuid,'c41be23f-bd64-4515-87f5-827f67f67927'::uuid,'81efb362-7cd2-4a55-b095-33056d5c6231'::uuid,'6f9fe5b3-2ba9-457b-8a3e-9599a5ddda2e'::uuid]) THEN RAISE EXCEPTION 'Conta não pertence às masters confirmadas' USING ERRCODE='42501'; END IF;
END IF;
IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.ml_minhas_contas_status()
RETURNS TABLE(account_id uuid,ml_user_id bigint,nickname text,site_id text,status text,token_expira_em timestamptz,tem_token boolean,jobs_total integer,jobs_concluidos integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT a.id,a.ml_user_id,a.nickname,a.site_id,a.status,t.expires_at,t.id IS NOT NULL,coalesce(j.total,0)::int,coalesce(j.ok,0)::int
FROM public.ml_accounts a
LEFT JOIN LATERAL(SELECT id,expires_at FROM public.ml_tokens WHERE account_id=a.id AND is_current ORDER BY created_at DESC LIMIT 1)t ON true
LEFT JOIN LATERAL(SELECT count(*) total,count(*) FILTER(WHERE status='done') ok FROM public.sync_jobs WHERE account_id=a.id AND trilha='backfill')j ON true
WHERE public.tem_permissao('integracoes.visualizar') AND (public.is_super_admin() OR a.conectado_por=auth.uid())
ORDER BY a.created_at DESC,a.id;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_minhas_contas_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ml_minhas_contas_status() TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated,service_role;