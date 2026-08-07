CREATE OR REPLACE FUNCTION public.qualidade_feeds_por_mes()
RETURNS TABLE(mes text, so_cpp bigint, so_cdp bigint, ambos bigint, sem_vinculo bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (SELECT public.is_admin() OR public.has_role(auth.uid(),'gerente') AS ok),
  u AS (
    SELECT tim_month_id AS mes, cus_cust_id_sel AS cust, true AS in_cpp, false AS in_cdp FROM public.raw_cpp_mensal
    UNION ALL
    SELECT tim_month_id, cus_cust_id_sel, false, true FROM public.raw_cdp_mensal
  ),
  g AS (
    SELECT mes, cust, bool_or(in_cpp) AS cpp, bool_or(in_cdp) AS cdp
    FROM u GROUP BY mes, cust
  )
  SELECT g.mes,
         count(*) FILTER (WHERE g.cpp AND NOT g.cdp),
         count(*) FILTER (WHERE g.cdp AND NOT g.cpp),
         count(*) FILTER (WHERE g.cpp AND g.cdp),
         count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.sellers s WHERE s.cust_id = g.cust))
  FROM g, allowed a
  WHERE a.ok
  GROUP BY g.mes
  ORDER BY g.mes DESC;
$$;

CREATE OR REPLACE FUNCTION public.qualidade_divergencias(_mes text)
RETURNS TABLE(cust_id text, nickname text, em_cpp boolean, em_cdp boolean, vinculado boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (SELECT public.is_admin() OR public.has_role(auth.uid(),'gerente') AS ok),
  u AS (
    SELECT cus_cust_id_sel AS cust, true AS cpp, false AS cdp, dados->>'CUS_NICKNAME' AS nick
      FROM public.raw_cpp_mensal WHERE tim_month_id = _mes
    UNION ALL
    SELECT cus_cust_id_sel, false, true, dados->>'CUS_NICKNAME'
      FROM public.raw_cdp_mensal WHERE tim_month_id = _mes
  ),
  g AS (
    SELECT cust, bool_or(cpp) AS cpp, bool_or(cdp) AS cdp, max(nick) AS nick
    FROM u GROUP BY cust
  )
  SELECT g.cust,
         COALESCE(g.nick, (SELECT s.nickname FROM public.sellers s WHERE s.cust_id = g.cust LIMIT 1)),
         g.cpp, g.cdp,
         EXISTS (SELECT 1 FROM public.sellers s WHERE s.cust_id = g.cust)
  FROM g, allowed a
  WHERE a.ok AND NOT (g.cpp AND g.cdp)
  ORDER BY g.cust;
$$;

CREATE OR REPLACE FUNCTION public.qualidade_nulos_criticos()
RETURNS TABLE(feed text, coluna text, total bigint, nulos bigint, pct_nulo numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (SELECT public.is_admin() OR public.has_role(auth.uid(),'gerente') AS ok),
  cols AS (
    SELECT 'CPP'::text AS feed, unnest(ARRAY['INV_PADS','TGMV_LC_PADS','SCORE_FINAL_BBF','SCORE_FINAL_PADS','REP_CURRENT_LEVEL','REP_DELAYED_HT_RATE','REP_CANCELLATIONS_RATE']) AS coluna
    UNION ALL
    SELECT 'CDP', unnest(ARRAY['CP_INVESTMENTS_LC','CP_INVESTIMENTS_SELLER_LC','TOTAL_INVESTIMENTS_LC','F_TGMV_LC_CUPOM','F_TGMV_LC_PRE_ACORDO'])
  )
  SELECT c.feed, c.coluna,
         CASE WHEN c.feed='CPP' THEN (SELECT count(*) FROM public.raw_cpp_mensal)
              ELSE (SELECT count(*) FROM public.raw_cdp_mensal) END,
         CASE WHEN c.feed='CPP' THEN (SELECT count(*) FROM public.raw_cpp_mensal r WHERE r.dados->>c.coluna IS NULL)
              ELSE (SELECT count(*) FROM public.raw_cdp_mensal r WHERE r.dados->>c.coluna IS NULL) END,
         ROUND(100.0 * (CASE WHEN c.feed='CPP' THEN (SELECT count(*) FROM public.raw_cpp_mensal r WHERE r.dados->>c.coluna IS NULL)
                             ELSE (SELECT count(*) FROM public.raw_cdp_mensal r WHERE r.dados->>c.coluna IS NULL) END)
               / NULLIF(CASE WHEN c.feed='CPP' THEN (SELECT count(*) FROM public.raw_cpp_mensal)
                             ELSE (SELECT count(*) FROM public.raw_cdp_mensal) END, 0), 1)
  FROM cols c, allowed a
  WHERE a.ok
  ORDER BY c.feed, c.coluna;
$$;

CREATE OR REPLACE FUNCTION public.qualidade_ultimo_import()
RETURNS TABLE(feed text, arquivo text, importado_em timestamptz, linhas bigint, meses bigint, sellers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (SELECT public.is_admin() OR public.has_role(auth.uid(),'gerente') AS ok)
  SELECT 'CPP'::text, (SELECT arquivo_origem FROM public.raw_cpp_mensal ORDER BY importado_em DESC LIMIT 1),
         (SELECT max(importado_em) FROM public.raw_cpp_mensal),
         (SELECT count(*) FROM public.raw_cpp_mensal),
         (SELECT count(DISTINCT tim_month_id) FROM public.raw_cpp_mensal),
         (SELECT count(DISTINCT cus_cust_id_sel) FROM public.raw_cpp_mensal)
  FROM allowed a WHERE a.ok
  UNION ALL
  SELECT 'CDP', (SELECT arquivo_origem FROM public.raw_cdp_mensal ORDER BY importado_em DESC LIMIT 1),
         (SELECT max(importado_em) FROM public.raw_cdp_mensal),
         (SELECT count(*) FROM public.raw_cdp_mensal),
         (SELECT count(DISTINCT tim_month_id) FROM public.raw_cdp_mensal),
         (SELECT count(DISTINCT cus_cust_id_sel) FROM public.raw_cdp_mensal)
  FROM allowed a WHERE a.ok;
$$;

REVOKE EXECUTE ON FUNCTION public.qualidade_feeds_por_mes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_divergencias(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_nulos_criticos() FROM anon;
REVOKE EXECUTE ON FUNCTION public.qualidade_ultimo_import() FROM anon;