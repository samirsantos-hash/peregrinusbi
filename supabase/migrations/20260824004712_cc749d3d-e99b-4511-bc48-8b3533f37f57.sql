CREATE UNIQUE INDEX IF NOT EXISTS fin_costs_uidx ON public.fin_costs (
  operation_pk,
  coalesce(ml_cost_id,''), coalesce(tipo,''),
  coalesce(detail_type,''), coalesce(concept_type,'')
);