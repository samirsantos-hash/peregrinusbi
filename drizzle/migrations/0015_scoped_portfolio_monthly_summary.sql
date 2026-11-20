CREATE OR REPLACE FUNCTION public.indicadores_carteira(p_seller_ids uuid[])
RETURNS TABLE(data date,seller_id uuid,metrics jsonb,is_latest boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH scoped AS (SELECT k.* FROM public.sellers_kpi k WHERE k.seller_id=ANY(p_seller_ids)), fields AS (
 SELECT k.data,j.key,CASE WHEN j.value='null'::jsonb THEN NULL ELSE (j.value #>> '{}')::numeric END AS val,
 j.key=ANY(ARRAY['gmv_lc','tsi','tgmv_lc','inv_pads','tgmv_lc_pads','tsi_pads','tgmv_lc_full','tgmv_lc_flex','tsi_flex','gmv_lc_m1','cdp_tgmv_lc','cdp_tsi','visits','visits_expensive','visits_match','visits_cheaper','visitas_clips','si_clips','orders_clips','tgmv_lc_clips','sellers_clips_publi']) AS summable
 FROM scoped k CROSS JOIN LATERAL jsonb_each(to_jsonb(k)) j
 WHERE j.key=ANY(ARRAY['gmv_lc','tsi','tgmv_lc','inv_pads','tgmv_lc_pads','tsi_pads','tgmv_lc_full','tgmv_lc_flex','tsi_flex','gmv_lc_m1','cdp_tgmv_lc','cdp_tsi','visits','visits_expensive','visits_match','visits_cheaper','visitas_clips','si_clips','orders_clips','tgmv_lc_clips','sellers_clips_publi','score_photo','score_title','score_oferta_final','score_caracteristica_final','score_qualidade_final','score_final_full','score_final_pads','rep_claims_rate','rep_delayed_ht_rate','rep_cancellations_rate','pontuacao_ipi','pontuacao_ll_gtin','min_price_rival','bpc','ll_pictures_score','ll_title_score','ll_tech_specs_score','ll_description_score','ll_price_score','ll_stock_availability_score','ll_free_shipping_score','ll_promotions_score'])
), aggregate_fields AS (
 SELECT data,key,CASE WHEN summable THEN sum(coalesce(val,0)) ELSE avg(val) FILTER(WHERE val<>0) END AS val FROM fields GROUP BY data,key,summable
), monthly AS (
 SELECT data,jsonb_object_agg(key,val) AS metrics FROM aggregate_fields GROUP BY data
), latest AS (SELECT DISTINCT ON(k.seller_id) k.* FROM scoped k ORDER BY k.seller_id,k.data DESC,k.id DESC)
SELECT m.data,NULL::uuid,m.metrics,false FROM monthly m
UNION ALL SELECT k.data,k.seller_id,to_jsonb(k),true FROM latest k;
$$;
REVOKE ALL ON FUNCTION public.indicadores_carteira(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.indicadores_carteira(uuid[]) TO authenticated,service_role;