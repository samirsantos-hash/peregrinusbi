CREATE OR REPLACE FUNCTION public.indicadores_tendencias(p_seller_ids uuid[])
RETURNS TABLE(seller_id uuid,tgmv_trend numeric,visits_trend numeric,ads_trend numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH days AS (SELECT DISTINCT k.data FROM public.sellers_kpi_daily k WHERE k.seller_id=ANY(p_seller_ids)), ranked AS (
 SELECT data,row_number() OVER (ORDER BY data) AS rn,count(*) OVER () AS n FROM days
), totals AS (
 SELECT k.seller_id,
 coalesce(sum(k.tgmv_lc) FILTER (WHERE d.rn<=d.n/2),0) AS g1,coalesce(sum(k.tgmv_lc) FILTER (WHERE d.rn>d.n/2),0) AS g2,
 coalesce(sum(k.visits) FILTER (WHERE d.rn<=d.n/2),0) AS v1,coalesce(sum(k.visits) FILTER (WHERE d.rn>d.n/2),0) AS v2,
 coalesce(sum(k.inv_pads) FILTER (WHERE d.rn<=d.n/2),0) AS a1,coalesce(sum(k.inv_pads) FILTER (WHERE d.rn>d.n/2),0) AS a2
 FROM public.sellers_kpi_daily k JOIN ranked d ON d.data=k.data WHERE k.seller_id=ANY(p_seller_ids) GROUP BY k.seller_id
)
SELECT seller_id,CASE WHEN g1>0 THEN (g2-g1)/g1*100 WHEN g2>0 THEN 100 ELSE 0 END,
 CASE WHEN v1>0 THEN (v2-v1)/v1*100 WHEN v2>0 THEN 100 ELSE 0 END,
 CASE WHEN a1>0 THEN (a2-a1)/a1*100 WHEN a2>0 THEN 100 ELSE 0 END FROM totals;
$$;
REVOKE ALL ON FUNCTION public.indicadores_tendencias(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_tendencias(uuid[]) TO authenticated,service_role;