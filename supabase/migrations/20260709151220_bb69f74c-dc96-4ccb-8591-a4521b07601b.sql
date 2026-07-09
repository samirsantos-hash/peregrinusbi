
ALTER TABLE public.upload_logs DROP CONSTRAINT IF EXISTS upload_logs_upload_type_check;
ALTER TABLE public.upload_logs ADD CONSTRAINT upload_logs_upload_type_check
  CHECK (upload_type = ANY (ARRAY[
    'cpp_mensal'::text,
    'cpp_diarizada'::text,
    'live_listings'::text,
    'elegibilidade'::text,
    'meli_campaigns'::text
  ]));

ALTER TABLE public.upload_logs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok';
ALTER TABLE public.upload_logs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.upload_logs DROP CONSTRAINT IF EXISTS upload_logs_status_check;
ALTER TABLE public.upload_logs ADD CONSTRAINT upload_logs_status_check
  CHECK (status = ANY (ARRAY['ok'::text, 'warning'::text, 'error'::text]));
