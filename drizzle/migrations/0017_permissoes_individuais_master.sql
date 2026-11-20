CREATE TABLE public.permissao_catalogo (chave text PRIMARY KEY, pai text REFERENCES public.permissao_catalogo(chave));
GRANT SELECT ON public.permissao_catalogo TO authenticated; GRANT ALL ON public.permissao_catalogo TO service_role;
ALTER TABLE public.permissao_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalogo_leitura ON public.permissao_catalogo FOR SELECT TO authenticated USING (true);
CREATE TABLE public.usuario_permissao_estado (user_id uuid PRIMARY KEY, legado boolean NOT NULL DEFAULT false, revisado_em timestamptz, revisado_por uuid);
GRANT SELECT ON public.usuario_permissao_estado TO authenticated; GRANT ALL ON public.usuario_permissao_estado TO service_role;
ALTER TABLE public.usuario_permissao_estado ENABLE ROW LEVEL SECURITY;
CREATE POLICY estado_leitura ON public.usuario_permissao_estado FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_super_admin());
INSERT INTO public.usuario_permissao_estado(user_id,legado) SELECT user_id,true FROM public.profiles ON CONFLICT DO NOTHING;
CREATE TABLE public.usuario_permissoes (user_id uuid NOT NULL, permissao text NOT NULL REFERENCES public.permissao_catalogo(chave), PRIMARY KEY(user_id,permissao));
GRANT SELECT ON public.usuario_permissoes TO authenticated; GRANT ALL ON public.usuario_permissoes TO service_role;
ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissoes_leitura ON public.usuario_permissoes FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_super_admin());
CREATE TABLE public.permissoes_auditoria (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, aprovado_por uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), antes text[] NOT NULL, depois text[] NOT NULL, legado_anterior boolean NOT NULL);
GRANT SELECT ON public.permissoes_auditoria TO authenticated; GRANT ALL ON public.permissoes_auditoria TO service_role;
ALTER TABLE public.permissoes_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditoria_master ON public.permissoes_auditoria FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(p_user_id uuid,p_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT p_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM permissao_catalogo WHERE chave=p_permissao) AND (
 public.has_role(p_user_id,'super_admin') OR EXISTS(SELECT 1 FROM usuario_permissao_estado WHERE user_id=p_user_id AND legado AND revisado_em IS NULL) OR
 (EXISTS(SELECT 1 FROM usuario_permissoes WHERE user_id=p_user_id AND permissao=p_permissao) AND NOT EXISTS(SELECT 1 FROM permissao_catalogo c WHERE c.chave=p_permissao AND c.pai IS NOT NULL AND NOT EXISTS(SELECT 1 FROM usuario_permissoes WHERE user_id=p_user_id AND permissao=c.pai))) ); $$;
REVOKE ALL ON FUNCTION public.usuario_tem_permissao(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.usuario_tem_permissao(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.tem_permissao(p_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.usuario_tem_permissao(auth.uid(),p_permissao); $$;
REVOKE ALL ON FUNCTION public.tem_permissao(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.tem_permissao(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.minhas_permissoes() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('master',public.is_super_admin(),'legado',coalesce((SELECT legado AND revisado_em IS NULL FROM usuario_permissao_estado WHERE user_id=auth.uid()),false),'revisado',EXISTS(SELECT 1 FROM usuario_permissao_estado WHERE user_id=auth.uid() AND revisado_em IS NOT NULL),'permissoes',coalesce((SELECT jsonb_agg(permissao ORDER BY permissao) FROM usuario_permissoes WHERE user_id=auth.uid()),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.minhas_permissoes() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.minhas_permissoes() TO authenticated;
CREATE OR REPLACE FUNCTION public.salvar_permissoes(p_user_id uuid,p_permissoes text[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_antes text[]; v_legado boolean; BEGIN
 IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Somente a conta master pode liberar funções' USING ERRCODE='42501'; END IF;
 IF public.has_role(p_user_id,'super_admin') THEN RAISE EXCEPTION 'Conta master tem acesso completo'; END IF;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
 IF p_permissoes IS NULL OR cardinality(p_permissoes)>100 OR EXISTS(SELECT 1 FROM unnest(p_permissoes) p WHERE p IS NULL OR NOT EXISTS(SELECT 1 FROM permissao_catalogo WHERE chave=p)) THEN RAISE EXCEPTION 'Permissão inválida'; END IF;
 IF EXISTS(SELECT 1 FROM permissao_catalogo c WHERE c.chave=ANY(p_permissoes) AND c.pai IS NOT NULL AND NOT c.pai=ANY(p_permissoes)) THEN RAISE EXCEPTION 'Alterar exige visualizar'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('permissoes-'||p_user_id::text,0));
 SELECT coalesce(array_agg(permissao ORDER BY permissao),'{}'::text[]) INTO v_antes FROM usuario_permissoes WHERE user_id=p_user_id;
 SELECT coalesce(legado,false) INTO v_legado FROM usuario_permissao_estado WHERE user_id=p_user_id;
 DELETE FROM usuario_permissoes WHERE user_id=p_user_id;
 INSERT INTO usuario_permissoes SELECT p_user_id,p FROM (SELECT DISTINCT unnest(p_permissoes) p) s;
 INSERT INTO usuario_permissao_estado(user_id,legado,revisado_em,revisado_por) VALUES(p_user_id,false,now(),auth.uid()) ON CONFLICT(user_id) DO UPDATE SET legado=false,revisado_em=now(),revisado_por=auth.uid();
 INSERT INTO permissoes_auditoria(user_id,aprovado_por,antes,depois,legado_anterior) VALUES(p_user_id,auth.uid(),v_antes,p_permissoes,coalesce(v_legado,false));
END; $$;
REVOKE ALL ON FUNCTION public.salvar_permissoes(uuid,text[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.salvar_permissoes(uuid,text[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.proteger_categoria_master() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF current_user IN ('authenticated','anon') AND NOT public.is_super_admin() THEN RAISE EXCEPTION 'Somente master altera categorias' USING ERRCODE='42501'; END IF;
 IF current_user IN ('authenticated','anon') AND (CASE WHEN TG_OP='DELETE' THEN OLD.role='super_admin' ELSE NEW.role='super_admin' END) THEN RAISE EXCEPTION 'Categoria master reservada' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$;
CREATE TRIGGER proteger_categoria_master BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.proteger_categoria_master();
DROP POLICY "Admins can manage all roles" ON public.user_roles;
CREATE POLICY master_roles_read ON public.user_roles FOR SELECT TO authenticated USING(public.is_super_admin());
CREATE POLICY master_roles_write ON public.user_roles FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
DROP POLICY "Admins can manage all access" ON public.user_access_control;
CREATE POLICY usuarios_access_read ON public.user_access_control FOR SELECT TO authenticated USING(public.tem_permissao('usuarios.visualizar'));
CREATE POLICY master_access_write ON public.user_access_control FOR ALL TO authenticated USING(public.is_super_admin()) WITH CHECK(public.is_super_admin());
CREATE POLICY usuarios_roles_read ON public.user_roles FOR SELECT TO authenticated USING(public.tem_permissao('usuarios.visualizar'));
CREATE OR REPLACE FUNCTION public.usuario_tem_alguma_permissao(p_permissoes text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM unnest(p_permissoes) p WHERE public.usuario_tem_permissao(auth.uid(),p)); $$;
REVOKE ALL ON FUNCTION public.usuario_tem_alguma_permissao(text[]) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.usuario_tem_alguma_permissao(text[]) TO authenticated,service_role;