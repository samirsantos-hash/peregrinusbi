ALTER TABLE public.fin_operations DROP COLUMN data_competencia;

ALTER TABLE public.fin_operations
  ADD COLUMN data_competencia date
  GENERATED ALWAYS AS ((operation_date AT TIME ZONE 'America/Sao_Paulo')::date) STORED;

CREATE INDEX IF NOT EXISTS idx_fin_operations_data_competencia
  ON public.fin_operations (data_competencia);