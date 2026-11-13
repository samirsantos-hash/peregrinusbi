ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS plano text;
CREATE OR REPLACE FUNCTION public.validar_plano_carteira() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.plano IS NOT NULL AND NEW.plano NOT IN ('tiro','medius','peritus') THEN
    RAISE EXCEPTION 'Plano inválido';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_plano_carteira ON public.portfolios;
CREATE TRIGGER trg_validar_plano_carteira BEFORE INSERT OR UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.validar_plano_carteira();