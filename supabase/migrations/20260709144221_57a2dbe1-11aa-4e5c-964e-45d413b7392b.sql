
-- 1) Numeric-string check on sellers.cust_id (safe: NOT VALID for existing rows)
ALTER TABLE public.sellers
  DROP CONSTRAINT IF EXISTS sellers_cust_id_numeric_chk;
ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_cust_id_numeric_chk
  CHECK (cust_id ~ '^[0-9]+$') NOT VALID;

-- 2) Add cust_id_text (generated) + seller_id uuid to the 5 legacy tables
ALTER TABLE public.cpp_mensal
  ADD COLUMN IF NOT EXISTS cust_id_text text GENERATED ALWAYS AS (cus_cust_id_sel::text) STORED,
  ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_cpp_mensal_cust_id_text ON public.cpp_mensal(cust_id_text);
CREATE INDEX IF NOT EXISTS idx_cpp_mensal_seller_id  ON public.cpp_mensal(seller_id);

ALTER TABLE public.cdp_mensal
  ADD COLUMN IF NOT EXISTS cust_id_text text GENERATED ALWAYS AS (cus_cust_id_sel::text) STORED,
  ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_cdp_mensal_cust_id_text ON public.cdp_mensal(cust_id_text);
CREATE INDEX IF NOT EXISTS idx_cdp_mensal_seller_id  ON public.cdp_mensal(seller_id);

ALTER TABLE public.gm_elegibilidade
  ADD COLUMN IF NOT EXISTS cust_id_text text GENERATED ALWAYS AS (cus_cust_id_sel::text) STORED,
  ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_gm_eleg_cust_id_text ON public.gm_elegibilidade(cust_id_text);
CREATE INDEX IF NOT EXISTS idx_gm_eleg_seller_id  ON public.gm_elegibilidade(seller_id);

ALTER TABLE public.gm_live_listings
  ADD COLUMN IF NOT EXISTS cust_id_text text GENERATED ALWAYS AS (cus_cust_id_sel::text) STORED,
  ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_gm_ll_cust_id_text ON public.gm_live_listings(cust_id_text);
CREATE INDEX IF NOT EXISTS idx_gm_ll_seller_id  ON public.gm_live_listings(seller_id);

ALTER TABLE public.sellers_pm
  ADD COLUMN IF NOT EXISTS cust_id_text text GENERATED ALWAYS AS (cust_id::text) STORED,
  ADD COLUMN IF NOT EXISTS seller_id uuid;
CREATE INDEX IF NOT EXISTS idx_sellers_pm_cust_id_text ON public.sellers_pm(cust_id_text);
CREATE INDEX IF NOT EXISTS idx_sellers_pm_seller_id  ON public.sellers_pm(seller_id);

-- 3) BEFORE INSERT/UPDATE trigger: fill seller_id from sellers via cust_id
CREATE OR REPLACE FUNCTION public.fill_seller_id_from_cust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cust text;
BEGIN
  IF TG_TABLE_NAME = 'sellers_pm' THEN
    v_cust := NEW.cust_id::text;
  ELSE
    v_cust := NEW.cus_cust_id_sel::text;
  END IF;

  IF v_cust IS NULL OR v_cust = '' THEN
    NEW.seller_id := NULL;
    RETURN NEW;
  END IF;

  SELECT id INTO NEW.seller_id
  FROM public.sellers
  WHERE cust_id = v_cust
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_seller_id ON public.cpp_mensal;
CREATE TRIGGER trg_fill_seller_id BEFORE INSERT OR UPDATE ON public.cpp_mensal
  FOR EACH ROW EXECUTE FUNCTION public.fill_seller_id_from_cust();

DROP TRIGGER IF EXISTS trg_fill_seller_id ON public.cdp_mensal;
CREATE TRIGGER trg_fill_seller_id BEFORE INSERT OR UPDATE ON public.cdp_mensal
  FOR EACH ROW EXECUTE FUNCTION public.fill_seller_id_from_cust();

DROP TRIGGER IF EXISTS trg_fill_seller_id ON public.gm_elegibilidade;
CREATE TRIGGER trg_fill_seller_id BEFORE INSERT OR UPDATE ON public.gm_elegibilidade
  FOR EACH ROW EXECUTE FUNCTION public.fill_seller_id_from_cust();

DROP TRIGGER IF EXISTS trg_fill_seller_id ON public.gm_live_listings;
CREATE TRIGGER trg_fill_seller_id BEFORE INSERT OR UPDATE ON public.gm_live_listings
  FOR EACH ROW EXECUTE FUNCTION public.fill_seller_id_from_cust();

DROP TRIGGER IF EXISTS trg_fill_seller_id ON public.sellers_pm;
CREATE TRIGGER trg_fill_seller_id BEFORE INSERT OR UPDATE ON public.sellers_pm
  FOR EACH ROW EXECUTE FUNCTION public.fill_seller_id_from_cust();

-- 4) Backfill seller_id for existing rows
UPDATE public.cpp_mensal t SET seller_id = s.id
  FROM public.sellers s
  WHERE s.cust_id = t.cus_cust_id_sel::text
    AND t.seller_id IS DISTINCT FROM s.id;

UPDATE public.cdp_mensal t SET seller_id = s.id
  FROM public.sellers s
  WHERE s.cust_id = t.cus_cust_id_sel::text
    AND t.seller_id IS DISTINCT FROM s.id;

UPDATE public.gm_elegibilidade t SET seller_id = s.id
  FROM public.sellers s
  WHERE s.cust_id = t.cus_cust_id_sel::text
    AND t.seller_id IS DISTINCT FROM s.id;

UPDATE public.gm_live_listings t SET seller_id = s.id
  FROM public.sellers s
  WHERE s.cust_id = t.cus_cust_id_sel::text
    AND t.seller_id IS DISTINCT FROM s.id;

UPDATE public.sellers_pm t SET seller_id = s.id
  FROM public.sellers s
  WHERE s.cust_id = t.cust_id::text
    AND t.seller_id IS DISTINCT FROM s.id;

-- 5) Extend sync_cust_id_from_sellers to also rename cust_id in legacy bigint tables
CREATE OR REPLACE FUNCTION public.sync_cust_id_from_sellers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_cid text := OLD.cust_id;
  new_cid text := NEW.cust_id;
  old_big bigint;
  new_big bigint;
BEGIN
  IF new_cid IS NULL OR old_cid IS NULL OR new_cid = old_cid THEN
    RETURN NEW;
  END IF;

  UPDATE public.portfolios
     SET cust_ids = (
       SELECT array_agg(DISTINCT CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(cust_ids) AS c
     )
   WHERE old_cid = ANY(cust_ids);

  UPDATE public.portfolios
     SET seller_aliases = (seller_aliases - old_cid)
                          || jsonb_build_object(new_cid, seller_aliases -> old_cid)
   WHERE seller_aliases ? old_cid;

  UPDATE public.portfolio_notifications
     SET added_cust_ids = (
       SELECT array_agg(CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(added_cust_ids) AS c
     )
   WHERE old_cid = ANY(added_cust_ids);

  UPDATE public.user_access_control
     SET allowed_cust_ids = (
       SELECT array_agg(DISTINCT CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(allowed_cust_ids) AS c
     )
   WHERE old_cid = ANY(allowed_cust_ids);

  IF old_cid ~ '^[0-9]+$' AND new_cid ~ '^[0-9]+$' THEN
    old_big := old_cid::bigint;
    new_big := new_cid::bigint;
    UPDATE public.cpp_mensal       SET cus_cust_id_sel = new_big WHERE cus_cust_id_sel = old_big;
    UPDATE public.cdp_mensal       SET cus_cust_id_sel = new_big WHERE cus_cust_id_sel = old_big;
    UPDATE public.gm_elegibilidade SET cus_cust_id_sel = new_big WHERE cus_cust_id_sel = old_big;
    UPDATE public.gm_live_listings SET cus_cust_id_sel = new_big WHERE cus_cust_id_sel = old_big;
    UPDATE public.sellers_pm       SET cust_id         = new_big WHERE cust_id         = old_big;
  END IF;

  RETURN NEW;
END;
$$;

-- 6) v_seller_bridge view
DROP VIEW IF EXISTS public.v_seller_bridge;
CREATE VIEW public.v_seller_bridge
WITH (security_invoker = on) AS
SELECT
  s.id      AS seller_uuid,
  s.cust_id AS cust_id_text,
  CASE WHEN s.cust_id ~ '^[0-9]+$' THEN s.cust_id::bigint ELSE NULL END AS cust_id_bigint,
  s.nickname
FROM public.sellers s;

GRANT SELECT ON public.v_seller_bridge TO authenticated;
