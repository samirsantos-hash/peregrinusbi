CREATE OR REPLACE FUNCTION public.get_data_coverage()
RETURNS TABLE(source text, period text, rows bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'cpp_mensal'::text, tim_month_id::text, count(*)::bigint
    FROM public.cpp_mensal
    WHERE tim_month_id IS NOT NULL
    GROUP BY tim_month_id
  UNION ALL
  SELECT 'cdp_mensal'::text, tim_month_id::text, count(*)::bigint
    FROM public.cdp_mensal
    WHERE tim_month_id IS NOT NULL
    GROUP BY tim_month_id
  UNION ALL
  SELECT 'sellers_kpi'::text, tim_month_id::text, count(*)::bigint
    FROM public.sellers_kpi
    WHERE tim_month_id IS NOT NULL
    GROUP BY tim_month_id
  UNION ALL
  SELECT 'sellers_kpi_daily'::text, to_char(data,'YYYY-MM-DD'), count(*)::bigint
    FROM public.sellers_kpi_daily
    WHERE data IS NOT NULL AND data >= (current_date - interval '120 days')
    GROUP BY data
  UNION ALL
  SELECT 'live_listings'::text, to_char(data,'YYYY-MM-DD'), count(*)::bigint
    FROM public.live_listings
    WHERE data IS NOT NULL AND data >= (current_date - interval '120 days')
    GROUP BY data
  UNION ALL
  SELECT 'seller_eligibility'::text, to_char(data,'YYYY-MM-DD'), count(*)::bigint
    FROM public.seller_eligibility
    WHERE data IS NOT NULL AND data >= (current_date - interval '60 days')
    GROUP BY data
  UNION ALL
  SELECT 'meli_campaigns'::text, to_char(data,'YYYY-MM-DD'), count(*)::bigint
    FROM public.meli_campaigns
    WHERE data IS NOT NULL AND data >= (current_date - interval '120 days')
    GROUP BY data
  ORDER BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.get_data_coverage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_data_coverage() TO authenticated;