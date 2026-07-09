
CREATE TABLE public.live_listings_backup_20260113_ghost AS
SELECT *
FROM public.live_listings
WHERE data = '2026-01-01'
  AND created_at >= '2026-03-13 01:56:00+00'
  AND created_at <= '2026-03-13 01:58:00+00'
  AND categoria IS NULL
  AND vertical IS NULL
  AND itens = 0;

ALTER TABLE public.live_listings_backup_20260113_ghost
  ADD COLUMN backed_up_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT ON public.live_listings_backup_20260113_ghost TO authenticated;
GRANT ALL ON public.live_listings_backup_20260113_ghost TO service_role;

ALTER TABLE public.live_listings_backup_20260113_ghost ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ghost backup"
  ON public.live_listings_backup_20260113_ghost
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
