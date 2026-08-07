CREATE POLICY "sftp_raw_admin_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sftp-raw' AND (public.is_admin() OR public.has_role(auth.uid(),'gerente')));

CREATE POLICY "sftp_raw_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sftp-raw' AND (public.is_admin() OR public.has_role(auth.uid(),'gerente')));