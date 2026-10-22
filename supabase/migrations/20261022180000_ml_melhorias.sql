-- Melhorias de anúncio: última análise por anúncio (achados das regras + sugestões da IA).
-- Só leitura para o painel; nada daqui é enviado ao Mercado Livre.

create table if not exists public.ml_listing_improvements (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  item_id text not null,
  titulo text,
  diagnostico jsonb not null,
  ia jsonb,
  erro_ia text,
  modelo text,
  entrada_hash text not null,
  qualidade_score numeric,
  achados_altos integer not null default 0,
  achados_total integer not null default 0,
  origem text not null check (origem in ('manual', 'diario')),
  gerado_por uuid references auth.users(id) on delete set null,
  gerado_em timestamptz not null default now(),
  verificado_em timestamptz not null default now(),
  primary key (account_id, item_id)
);

create index if not exists ml_listing_improvements_prioridade_idx
  on public.ml_listing_improvements (account_id, achados_altos desc, qualidade_score asc nulls last);

alter table public.ml_listing_improvements enable row level security;
grant select on public.ml_listing_improvements to authenticated;
grant all on public.ml_listing_improvements to service_role;

drop policy if exists ml_listing_improvements_select on public.ml_listing_improvements;
create policy ml_listing_improvements_select on public.ml_listing_improvements
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

-- De hora em hora: cada execução analisa, dentro do limite de tempo, os mais vendidos ainda não verificados hoje.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-listing-improve') then
    perform cron.unschedule('ml-listing-improve');
  end if;
  perform cron.schedule(
    'ml-listing-improve',
    '35 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-listing-improve')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-listing-improve fica só manual: %', sqlerrm;
end $$;
