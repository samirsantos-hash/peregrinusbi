create table if not exists public.ml_oauth_states (
  state       text primary key,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  usuario_id  uuid not null,
  seller_id   uuid,
  expires_at  timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.ml_oauth_states enable row level security;
revoke all on public.ml_oauth_states from anon, authenticated;
grant all on public.ml_oauth_states to service_role;

create index if not exists ml_oauth_states_exp_idx
  on public.ml_oauth_states (expires_at) where consumed_at is null;

create or replace function public.ml_token_rotacionar(
  p_account_id uuid, p_access text, p_refresh text,
  p_scope text, p_expires_at timestamptz)
returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 0));
  update ml_tokens set is_current = false
   where account_id = p_account_id and is_current;
  insert into ml_tokens (account_id, access_token, refresh_token, scope, expires_at)
  values (p_account_id, p_access, p_refresh, p_scope, p_expires_at);
end $$;

revoke execute on function public.ml_token_rotacionar(uuid,text,text,text,timestamptz)
  from public, anon, authenticated;

create or replace function public.ml_agendar_backfill(p_account_id uuid, p_meses int default 12)
returns int language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_ini date; v_fim date; n int := 0;
begin
  for i in 0 .. p_meses - 1 loop
    v_ini := date_trunc('month', current_date - (i || ' months')::interval)::date;
    v_fim := (date_trunc('month', current_date - (i||' months')::interval)
              + interval '1 month - 1 day')::date;
    insert into sync_jobs (account_id, endpoint, start_date, end_date,
                           trilha, scheduled_at)
    values (p_account_id, 'daily', v_ini, least(v_fim, current_date),
            'backfill', now() + (i * interval '3 minutes'))
    on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.ml_agendar_backfill(uuid,int)
  from public, anon, authenticated;

update public.ml_accounts set status = 'disabled' where ml_user_id = 999000001;