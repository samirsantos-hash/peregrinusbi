
CREATE OR REPLACE FUNCTION public.sync_cust_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_cid text;
  new_cid text;
BEGIN
  IF NEW.cust_id IS NULL OR OLD.cust_id IS NULL OR NEW.cust_id = OLD.cust_id THEN
    RETURN NEW;
  END IF;

  old_cid := OLD.cust_id::text;
  new_cid := NEW.cust_id::text;

  -- Keep public.sellers in sync (avoid unique conflicts)
  DELETE FROM public.sellers WHERE cust_id = new_cid AND cust_id <> old_cid;
  UPDATE public.sellers SET cust_id = new_cid WHERE cust_id = old_cid;

  -- Update portfolios: replace old cust_id with new inside cust_ids array
  UPDATE public.portfolios
     SET cust_ids = (
       SELECT array_agg(DISTINCT CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(cust_ids) AS c
     )
   WHERE old_cid = ANY(cust_ids);

  -- Update seller_aliases jsonb keys if present
  UPDATE public.portfolios
     SET seller_aliases = (seller_aliases - old_cid)
                          || jsonb_build_object(new_cid, seller_aliases -> old_cid)
   WHERE seller_aliases ? old_cid;

  -- Update notifications
  UPDATE public.portfolio_notifications
     SET added_cust_ids = (
       SELECT array_agg(CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(added_cust_ids) AS c
     )
   WHERE old_cid = ANY(added_cust_ids);

  -- Update access control lists
  UPDATE public.user_access_control
     SET allowed_cust_ids = (
       SELECT array_agg(DISTINCT CASE WHEN c = old_cid THEN new_cid ELSE c END)
       FROM unnest(allowed_cust_ids) AS c
     )
   WHERE old_cid = ANY(allowed_cust_ids);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cust_id_change ON public.sellers_pm;
CREATE TRIGGER trg_sync_cust_id_change
AFTER UPDATE OF cust_id ON public.sellers_pm
FOR EACH ROW
WHEN (OLD.cust_id IS DISTINCT FROM NEW.cust_id)
EXECUTE FUNCTION public.sync_cust_id_change();

-- Also sync when someone edits sellers.cust_id directly
CREATE OR REPLACE FUNCTION public.sync_cust_id_from_sellers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_cid text := OLD.cust_id;
  new_cid text := NEW.cust_id;
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cust_id_from_sellers ON public.sellers;
CREATE TRIGGER trg_sync_cust_id_from_sellers
AFTER UPDATE OF cust_id ON public.sellers
FOR EACH ROW
WHEN (OLD.cust_id IS DISTINCT FROM NEW.cust_id)
EXECUTE FUNCTION public.sync_cust_id_from_sellers();
