create or replace function public.ml_contas_status()
returns table (
  account_id uuid,
  ml_user_id bigint,
  nickname text,
  site_id text,
  status text,
  token_expira_em timestamptz,
  tem_token boolean,
  jobs_total int,
  jobs_concluidos int
)
language sql stable security definer
set search_path = public, pg_temp as $$
  select a.id,
         a.ml_user_id,
         a.nickname,
         a.site_id,
         a.status,
         t.expires_at,
         t.id is not null,
         coalesce(j.total, 0)::int,
         coalesce(j.ok, 0)::int
    from ml_accounts a
    left join lateral (
      select id, expires_at from ml_tokens
       where account_id = a.id and is_current
       order by created_at desc limit 1
    ) t on true
    left join lateral (
      select count(*) as total,
             count(*) filter (where status = 'done') as ok
        from sync_jobs where account_id = a.id and trilha = 'backfill'
    ) j on true
   where public.is_super_admin()
      or has_role(auth.uid(), 'admin'::app_role)
      or has_role(auth.uid(), 'gerente'::app_role)
   order by a.created_at desc;
$$;

revoke execute on function public.ml_contas_status() from public, anon;
grant execute on function public.ml_contas_status() to authenticated;