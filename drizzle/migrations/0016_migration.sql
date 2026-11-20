CREATE OR REPLACE FUNCTION public.ml_pode_gerir_conta(p_account_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select public.ml_e_consultor(auth.uid()) and (
    (public.has_role(auth.uid(), 'super_admin') and exists (select 1 from public.ml_accounts a where a.id = p_account_id))
    or exists (
      select 1 from public.ml_accounts a
      join public.user_access_control c on c.user_id = auth.uid()
      where a.id = p_account_id and a.ml_user_id::text = any (c.allowed_cust_ids)));
$function$;