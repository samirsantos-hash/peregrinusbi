-- Perguntas dos compradores por conta conectada. Leitura pela RLS; escrita só pelas funções.

create table if not exists public.ml_questions (
  question_id bigint primary key,
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  item_id text,
  item_titulo text,
  item_thumbnail text,
  item_link text,
  texto text,
  status text not null,
  data_criacao timestamptz,
  from_id bigint,
  resposta_texto text,
  resposta_status text,
  resposta_data timestamptz,
  respondida_por uuid references auth.users(id) on delete set null,
  synced_at timestamptz not null default now()
);

create index if not exists ml_questions_conta_status_idx
  on public.ml_questions (account_id, status, data_criacao desc);

alter table public.ml_questions enable row level security;
grant select on public.ml_questions to authenticated;
grant all on public.ml_questions to service_role;

drop policy if exists ml_questions_select on public.ml_questions;
create policy ml_questions_select on public.ml_questions
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

do $$
begin
  alter publication supabase_realtime add table public.ml_questions;
exception
  when duplicate_object then null;
  when undefined_object then raise notice 'publicação supabase_realtime ausente';
end $$;

-- Contas que a pessoa gerencia (mesmo critério da RLS), para o seletor das telas.
create or replace function public.ml_contas_gerenciaveis()
returns table (id uuid, ml_user_id bigint, nickname text, site_id text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.ml_user_id, a.nickname, a.site_id
  from public.ml_accounts a
  where a.status = 'active' and public.ml_pode_gerir_conta(a.id)
  order by a.nickname nulls last, a.ml_user_id;
$$;

revoke all on function public.ml_contas_gerenciaveis() from public;
grant execute on function public.ml_contas_gerenciaveis() to authenticated;

-- A cada 6 horas: completa o que o webhook e o missed_feeds não trouxeram.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-questions-sync') then
    perform cron.unschedule('ml-questions-sync');
  end if;
  perform cron.schedule(
    'ml-questions-sync',
    '40 */6 * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-questions-sync')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-questions-sync fica só manual: %', sqlerrm;
end $$;
