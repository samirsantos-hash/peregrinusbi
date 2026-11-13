CREATE OR REPLACE FUNCTION public.registrar_aviso_painel(p_codigo text, p_origem text, p_duracao_ms integer DEFAULT NULL::integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE v_cat text; v_msg text; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login' USING ERRCODE='42501'; END IF;
IF p_origem NOT IN ('painel','publicidade','perguntas','anuncios','promocoes','integracoes','mercado','admin') THEN RETURN; END IF;
CASE p_codigo WHEN 'carregamento_falhou' THEN v_cat:='carregamento'; v_msg:='Falha ao carregar dados da tela.'; WHEN 'renderizacao_falhou' THEN v_cat:='erro'; v_msg:='Falha ao exibir uma tela.'; WHEN 'atualizacao_falhou' THEN v_cat:='atualizacao'; v_msg:='Uma solicitação de atualização falhou.'; WHEN 'leitura_parcial' THEN v_cat:='atualizacao'; v_msg:='Leitura concluída com avisos; parte dos dados não foi atualizada.'; WHEN 'resposta_lenta' THEN IF p_duracao_ms IS NULL OR p_duracao_ms<1000 THEN RETURN; END IF; v_cat:='lentidao'; v_msg:='Uma resposta demorou mais de 1 segundo.'; ELSE RETURN; END CASE;
PERFORM pg_advisory_xact_lock(hashtextextended('developer-alert-'||p_origem||p_codigo,0));
IF EXISTS(SELECT 1 FROM public.developer_alerts WHERE origem=p_origem AND codigo=p_codigo AND criado_em>now()-interval '5 minutes') THEN RETURN; END IF;
INSERT INTO public.developer_alerts(categoria,origem,codigo,mensagem,duracao_ms) VALUES(v_cat,p_origem,p_codigo,v_msg,CASE WHEN p_duracao_ms BETWEEN 0 AND 3600000 THEN p_duracao_ms ELSE NULL END);
END; $function$;