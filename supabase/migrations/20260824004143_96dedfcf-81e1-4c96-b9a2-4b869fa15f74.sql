DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.fin_costs'::regclass
       AND contype = 'f'
       AND conname = 'fin_costs_account_fk'
  ) THEN
    ALTER TABLE public.fin_costs
      ADD CONSTRAINT fin_costs_account_fk
      FOREIGN KEY (account_id) REFERENCES public.ml_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fin_costs_account_id ON public.fin_costs (account_id);