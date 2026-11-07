CREATE OR REPLACE FUNCTION public.indicadores_classificacao(p_seller_ids uuid[])
RETURNS TABLE(seller_id uuid, data date, tim_month_id integer, tgmv_lc numeric, gmv_lc numeric, tsi numeric, visits numeric, inv_pads numeric, rep_current_level text, rep_cancellations_rate numeric, ll_stock_availability_score numeric, meses_total bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
WITH monthly AS (
 SELECT k.seller_id,
 coalesce(to_char(to_date(nullif(k.tim_month_id,0)::text,'YYYYMM'),'YYYY-MM'),to_char(k.data,'YYYY-MM')) AS mes,
 sum(coalesce(nullif(k.tgmv_lc,0),k.gmv_lc,0)) AS receita,
 sum(coalesce(k.tsi,0)) AS pedidos, sum(coalesce(k.visits,0)) AS visitas, sum(coalesce(k.inv_pads,0)) AS investimento,
 (array_agg(k.rep_current_level ORDER BY k.data DESC,k.id DESC) FILTER (WHERE k.rep_current_level IS NOT NULL AND k.rep_current_level <> ''))[1] AS reputacao,
 avg(k.rep_cancellations_rate) FILTER (WHERE k.rep_cancellations_rate>0) AS bs,
 avg(k.ll_stock_availability_score) FILTER (WHERE k.ll_stock_availability_score>0) AS stock
 FROM public.sellers_kpi k WHERE k.seller_id=ANY(p_seller_ids) GROUP BY k.seller_id,mes
), ranked AS (
 SELECT m.*,row_number() OVER (PARTITION BY m.seller_id ORDER BY m.mes DESC) AS rn,count(*) OVER (PARTITION BY m.seller_id) AS meses_total FROM monthly m WHERE mes IS NOT NULL
)
SELECT seller_id,to_date(mes||'-01','YYYY-MM-DD'),replace(mes,'-','')::integer,receita,0::numeric,pedidos,visitas,investimento,reputacao,bs,stock,meses_total FROM ranked WHERE rn<=6 ORDER BY seller_id,mes;
$$;
REVOKE ALL ON FUNCTION public.indicadores_classificacao(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_classificacao(uuid[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.indicadores_ultimos(p_seller_ids uuid[])
RETURNS SETOF public.sellers_kpi LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT DISTINCT ON (k.seller_id) k.* FROM public.sellers_kpi k WHERE k.seller_id=ANY(p_seller_ids) ORDER BY k.seller_id,k.data DESC,k.id DESC; $$;
REVOKE ALL ON FUNCTION public.indicadores_ultimos(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_ultimos(uuid[]) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.indicadores_verticais(p_seller_ids uuid[])
RETURNS TABLE(seller_id uuid,vertical text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT DISTINCT ON (l.seller_id) l.seller_id,l.vertical FROM public.live_listings l WHERE l.seller_id=ANY(p_seller_ids) AND l.vertical IS NOT NULL AND trim(l.vertical)<>'' ORDER BY l.seller_id,l.itens DESC NULLS LAST,l.id; $$;
REVOKE ALL ON FUNCTION public.indicadores_verticais(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_verticais(uuid[]) TO authenticated,service_role;