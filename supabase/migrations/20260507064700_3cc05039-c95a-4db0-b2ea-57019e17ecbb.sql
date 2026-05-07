CREATE OR REPLACE VIEW public.vw_reputacao_mensal AS
SELECT
  date_trunc('month', k.data)::date as mes_ref,
  count(distinct k.seller_id) filter (where k.rep_claims_rate is not null) as n_sellers_claims,
  count(distinct k.seller_id) filter (where k.rep_delayed_ht_rate is not null) as n_sellers_atrasos,
  count(distinct k.seller_id) as n_sellers_total,

  case when sum(k.tgmv_lc) filter (where k.rep_claims_rate is not null) > 0
       then sum(k.rep_claims_rate * k.tgmv_lc) filter (where k.rep_claims_rate is not null)
            / nullif(sum(k.tgmv_lc) filter (where k.rep_claims_rate is not null), 0)
       end as claims_pond_tgmv,

  case when sum(k.tgmv_lc) filter (where k.rep_delayed_ht_rate is not null) > 0
       then sum(k.rep_delayed_ht_rate * k.tgmv_lc) filter (where k.rep_delayed_ht_rate is not null)
            / nullif(sum(k.tgmv_lc) filter (where k.rep_delayed_ht_rate is not null), 0)
       end as atrasos_pond_tgmv,

  percentile_cont(0.5) within group (order by k.rep_claims_rate) filter (where k.rep_claims_rate is not null) as claims_mediana,
  percentile_cont(0.5) within group (order by k.rep_delayed_ht_rate) filter (where k.rep_delayed_ht_rate is not null) as atrasos_mediana,

  percentile_cont(0.90) within group (order by k.rep_claims_rate) filter (where k.rep_claims_rate is not null) as claims_p90,
  percentile_cont(0.90) within group (order by k.rep_delayed_ht_rate) filter (where k.rep_delayed_ht_rate is not null) as atrasos_p90
FROM public.sellers_kpi k
WHERE k.data IS NOT NULL
GROUP BY date_trunc('month', k.data)
ORDER BY mes_ref;