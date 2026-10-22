create or replace function public.ml_e_consultor(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user_id is not null and (
    exists (select 1 from public.user_roles r where r.user_id = p_user_id
        and r.role in ('super_admin'::public.app_role, 'admin'::public.app_role, 'gerente'::public.app_role))
    or exists (select 1 from public.portfolios p where p.assigned_to = p_user_id)
  );
$$;
revoke all on function public.ml_e_consultor(uuid) from public, anon, authenticated;
grant execute on function public.ml_e_consultor(uuid) to service_role;

create or replace function public.ml_sou_consultor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.ml_e_consultor(auth.uid());
$$;
revoke all on function public.ml_sou_consultor() from public, anon;
grant execute on function public.ml_sou_consultor() to authenticated;

create or replace function public.ml_pode_gerir_conta(p_account_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.ml_e_consultor(auth.uid()) and exists (
    select 1 from public.ml_accounts a
    join public.user_access_control c on c.user_id = auth.uid()
    where a.id = p_account_id and a.ml_user_id::text = any (c.allowed_cust_ids));
$$;
revoke all on function public.ml_pode_gerir_conta(uuid) from public, anon;
grant execute on function public.ml_pode_gerir_conta(uuid) to authenticated, service_role;

create or replace function public.ml_destinatarios_conta(p_account_id uuid)
returns table (user_id uuid) language sql stable security definer set search_path = public as $$
  select distinct c.user_id from public.ml_accounts a
  join public.user_access_control c on a.ml_user_id::text = any (c.allowed_cust_ids)
  where a.id = p_account_id and public.ml_e_consultor(c.user_id);
$$;
revoke all on function public.ml_destinatarios_conta(uuid) from public, anon, authenticated;
grant execute on function public.ml_destinatarios_conta(uuid) to service_role;

create table if not exists public.ml_audit_log (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  account_id uuid references public.ml_accounts(id) on delete cascade,
  acao text not null, payload jsonb, resposta_ml jsonb, codigo_ml text,
  criado_em timestamptz not null default now());
create index if not exists ml_audit_log_conta_idx on public.ml_audit_log (account_id, criado_em desc);
grant select on public.ml_audit_log to authenticated;
grant all on public.ml_audit_log to service_role;
alter table public.ml_audit_log enable row level security;
drop policy if exists ml_audit_log_select on public.ml_audit_log;
create policy ml_audit_log_select on public.ml_audit_log for select to authenticated
  using (account_id is not null and public.ml_pode_gerir_conta(account_id));

create table if not exists public.ml_action_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  acao text not null, idempotency_key text not null,
  status text not null check (status in ('preview', 'processing', 'committed', 'failed', 'conflict')),
  antes jsonb, depois jsonb, payload jsonb, resposta_ml jsonb, estado_ml_hash text, codigo_ml text, erro text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  unique (account_id, usuario_id, idempotency_key));
create index if not exists ml_action_requests_conta_idx on public.ml_action_requests (account_id, criado_em desc);
grant select on public.ml_action_requests to authenticated;
grant all on public.ml_action_requests to service_role;
alter table public.ml_action_requests enable row level security;
drop policy if exists ml_action_requests_select on public.ml_action_requests;
create policy ml_action_requests_select on public.ml_action_requests for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

create table if not exists public.ml_settings (
  account_id uuid primary key references public.ml_accounts(id) on delete cascade,
  meta_investimento_ads numeric(6,4) not null default 0.0300 check (meta_investimento_ads >= 0 and meta_investimento_ads <= 1),
  acos_alvo numeric(6,4) check (acos_alvo is null or (acos_alvo >= 0 and acos_alvo <= 1)),
  margem_minima numeric(6,4) check (margem_minima is null or (margem_minima >= 0 and margem_minima <= 1)),
  alerta_acos numeric(6,4) not null default 0.1000 check (alerta_acos >= 0 and alerta_acos <= 1),
  alerta_roas numeric(8,2) not null default 5 check (alerta_roas >= 0),
  alerta_ctr numeric(6,4) not null default 0.0010 check (alerta_ctr >= 0 and alerta_ctr <= 1),
  alerta_cpc numeric(10,2) not null default 3.50 check (alerta_cpc >= 0),
  alerta_tacos numeric(6,4) not null default 0.0500 check (alerta_tacos >= 0 and alerta_tacos <= 1),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null);
grant select on public.ml_settings to authenticated;
grant all on public.ml_settings to service_role;
alter table public.ml_settings enable row level security;
drop policy if exists ml_settings_select on public.ml_settings;
create policy ml_settings_select on public.ml_settings for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

create or replace function public.ml_settings_criar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ml_settings (account_id) values (new.id) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists ml_accounts_settings on public.ml_accounts;
create trigger ml_accounts_settings after insert on public.ml_accounts
  for each row execute function public.ml_settings_criar();
insert into public.ml_settings (account_id) select id from public.ml_accounts on conflict do nothing;

create table if not exists public.ml_webhook_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique, topic text not null, resource text not null,
  ml_user_id bigint, application_id text,
  account_id uuid references public.ml_accounts(id) on delete set null,
  payload jsonb not null, recurso jsonb,
  status text not null default 'recebido' check (status in ('recebido', 'processado', 'ignorado', 'erro')),
  erro text, codigo_ml text,
  recebido_em timestamptz not null default now(), processado_em timestamptz);
create index if not exists ml_webhook_events_user_idx on public.ml_webhook_events (ml_user_id, recebido_em desc);
grant all on public.ml_webhook_events to service_role;
alter table public.ml_webhook_events enable row level security;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.ml_accounts(id) on delete cascade,
  tipo text not null, titulo text not null, corpo text not null, payload jsonb,
  lida_em timestamptz, criado_em timestamptz not null default now());
create index if not exists notifications_user_idx on public.notifications (user_id, criado_em desc);
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() and (account_id is null or public.ml_pode_gerir_conta(account_id)));

create or replace function public.ml_notificacao_lida(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set lida_em = now()
   where id = p_id and user_id = auth.uid() and lida_em is null;
end; $$;
revoke all on function public.ml_notificacao_lida(uuid) from public, anon;
grant execute on function public.ml_notificacao_lida(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then raise notice 'realtime: %', sqlerrm;
end $$;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'ml-webhook-reconcile') then
    perform cron.unschedule('ml-webhook-reconcile');
  end if;
  perform cron.schedule('ml-webhook-reconcile', '5 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-webhook-reconcile')$cron$);
exception when others then raise notice 'pg_cron: %', sqlerrm;
end $$;