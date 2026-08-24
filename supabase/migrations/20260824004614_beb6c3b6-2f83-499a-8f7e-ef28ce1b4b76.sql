ALTER TABLE public.fin_costs DROP CONSTRAINT fin_costs_uk;

ALTER TABLE public.fin_costs
  ADD CONSTRAINT fin_costs_uk
  UNIQUE NULLS NOT DISTINCT (operation_pk, ml_cost_id, tipo, detail_type, concept_type);