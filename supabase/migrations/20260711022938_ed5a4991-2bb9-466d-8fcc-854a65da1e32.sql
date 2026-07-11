
CREATE TABLE IF NOT EXISTS public.drive_ingest_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  modified_time TIMESTAMPTZ NOT NULL,
  file_size BIGINT,
  import_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rows_imported INTEGER DEFAULT 0,
  chunks_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (file_id, modified_time)
);

CREATE INDEX IF NOT EXISTS idx_drive_ingest_log_file_id ON public.drive_ingest_log(file_id);
CREATE INDEX IF NOT EXISTS idx_drive_ingest_log_started_at ON public.drive_ingest_log(started_at DESC);

GRANT SELECT ON public.drive_ingest_log TO authenticated;
GRANT ALL ON public.drive_ingest_log TO service_role;

ALTER TABLE public.drive_ingest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view drive ingest log"
  ON public.drive_ingest_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
