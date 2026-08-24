-- 2. ml_tokens inacessível a usuários finais
REVOKE ALL ON public.ml_tokens FROM authenticated, anon;
GRANT ALL ON public.ml_tokens TO service_role;

-- 4. unique de fin_costs sem valor monetário
ALTER TABLE public.fin_costs DROP CONSTRAINT IF EXISTS fin_costs_operation_pk_ml_cost_id_tipo_net_cost_key;
ALTER TABLE public.fin_costs ADD CONSTRAINT fin_costs_uk UNIQUE (operation_pk, ml_cost_id, tipo, detail_type, concept_type);

-- 5. data_competencia gerada
ALTER TABLE public.fin_operations DROP COLUMN data_competencia;
ALTER TABLE public.fin_operations
  ADD COLUMN data_competencia date
  GENERATED ALWAYS AS ((operation_date AT TIME ZONE INTERVAL '-03:00')::date) STORED;

-- 6. índices para FKs sem índice
CREATE INDEX IF NOT EXISTS idx_ml_accounts_tenant_id ON public.ml_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_operations_raw_id ON public.fin_operations (raw_id);
CREATE INDEX IF NOT EXISTS idx_stg_ml_daily_raw_sync_job_id ON public.stg_ml_daily_raw (sync_job_id);
CREATE INDEX IF NOT EXISTS idx_multilojas_loja_conta_id ON public.multilojas_loja (conta_id);
CREATE INDEX IF NOT EXISTS idx_multilojas_carga_fonte_id ON public.multilojas_carga (fonte_id);
CREATE INDEX IF NOT EXISTS idx_fin_operations_account_competencia ON public.fin_operations (account_id, data_competencia);