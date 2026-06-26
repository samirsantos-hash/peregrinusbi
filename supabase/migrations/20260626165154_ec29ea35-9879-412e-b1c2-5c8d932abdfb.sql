CREATE TABLE public.portfolio_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID,
  portfolio_name TEXT NOT NULL,
  added_cust_ids TEXT[] NOT NULL DEFAULT '{}',
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_notifications TO authenticated;
GRANT ALL ON public.portfolio_notifications TO service_role;

ALTER TABLE public.portfolio_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications"
  ON public.portfolio_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update their own notifications"
  ON public.portfolio_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications"
  ON public.portfolio_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users delete their own notifications"
  ON public.portfolio_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_portfolio_notifications_user ON public.portfolio_notifications(user_id, read, created_at DESC);
