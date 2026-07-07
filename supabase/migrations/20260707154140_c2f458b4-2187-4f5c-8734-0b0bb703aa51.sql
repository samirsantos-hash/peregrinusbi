DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.portfolio_notifications;
CREATE POLICY "Users can insert their own notifications"
ON public.portfolio_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);