UPDATE public.portfolios p
SET cust_ids = (
  SELECT array_agg(DISTINCT c) FROM (
    SELECT unnest(p.cust_ids) AS c
    UNION
    SELECT g.cust_id FROM public.gm_concessionarias g
  ) t
)
WHERE p.name = 'GM';