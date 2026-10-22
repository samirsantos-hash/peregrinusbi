-- Etapa 2 — Product Ads, só leitura.
-- A métrica diária da API cobre no máximo 90 dias. O grão do anúncio é o Ad Group.

create table if not exists public.ml_ads_estado (
  account_id uuid primary key references public.ml_accounts(id) on delete cascade,
  status text not null check (status in ('ativo', 'sem_product_ads')),
  metricas_campanha_em timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.ml_ads_advertisers (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  advertiser_id bigint not null,
  site_id text not null,
  advertiser_name text,
  account_name text,
  synced_at timestamptz not null default now(),
  primary key (account_id, advertiser_id)
);

create table if not exists public.ml_ads_campaigns (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  campaign_id bigint not null,
  advertiser_id bigint not null,
  site_id text not null,
  name text,
  status text,
  channel text,
  strategy text,
  daily_budget numeric,
  budget numeric,
  currency_id text,
  acos_target numeric,
  roas_target numeric,
  automatic_budget boolean,
  date_created timestamptz,
  last_updated timestamptz,
  synced_at timestamptz not null default now(),
  primary key (account_id, campaign_id)
);

create table if not exists public.ml_ads_ads (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  ad_group_id bigint not null,
  advertiser_id bigint not null,
  site_id text not null,
  campaign_id bigint,
  ad_group_type text,
  external_id text,
  status text,
  title text,
  catalog_listing boolean,
  channel text,
  synced_at timestamptz not null default now(),
  primary key (account_id, ad_group_id)
);

create index if not exists ml_ads_ads_campanha_idx on public.ml_ads_ads (account_id, campaign_id);

create table if not exists public.ml_ads_metrics_daily (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  nivel text not null check (nivel in ('campanha', 'anuncio')),
  campaign_id bigint not null,
  ad_group_id bigint not null default 0,
  dia date not null,
  prints bigint,
  clicks bigint,
  ctr numeric,
  cpc numeric,
  cost numeric,
  direct_amount numeric,
  indirect_amount numeric,
  total_amount numeric,
  units_quantity bigint,
  acos numeric,
  roas numeric,
  cvr numeric,
  synced_at timestamptz not null default now(),
  primary key (account_id, nivel, campaign_id, ad_group_id, dia)
);

create index if not exists ml_ads_metrics_daily_conta_idx
  on public.ml_ads_metrics_daily (account_id, dia desc);

-- Controle da leitura diária por campanha: a API de Ad Groups só entrega série dia a dia.
create table if not exists public.ml_ads_dias_sync (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  campaign_id bigint not null,
  dia date not null,
  synced_at timestamptz not null default now(),
  primary key (account_id, campaign_id, dia)
);

alter table public.ml_ads_dias_sync enable row level security;
grant all on public.ml_ads_dias_sync to service_role;

alter table public.ml_ads_estado enable row level security;
alter table public.ml_ads_advertisers enable row level security;
alter table public.ml_ads_campaigns enable row level security;
alter table public.ml_ads_ads enable row level security;
alter table public.ml_ads_metrics_daily enable row level security;

grant select on public.ml_ads_estado, public.ml_ads_advertisers, public.ml_ads_campaigns, public.ml_ads_ads, public.ml_ads_metrics_daily to authenticated;
grant all on public.ml_ads_estado, public.ml_ads_advertisers, public.ml_ads_campaigns, public.ml_ads_ads, public.ml_ads_metrics_daily to service_role;

drop policy if exists ml_ads_estado_select on public.ml_ads_estado;
create policy ml_ads_estado_select on public.ml_ads_estado
  for select to authenticated using (public.ml_pode_gerir_conta(account_id));

drop policy if exists ml_ads_advertisers_select on public.ml_ads_advertisers;
create policy ml_ads_advertisers_select on public.ml_ads_advertisers
  for select to authenticated using (public.ml_pode_gerir_conta(account_id));

drop policy if exists ml_ads_campaigns_select on public.ml_ads_campaigns;
create policy ml_ads_campaigns_select on public.ml_ads_campaigns
  for select to authenticated using (public.ml_pode_gerir_conta(account_id));

drop policy if exists ml_ads_ads_select on public.ml_ads_ads;
create policy ml_ads_ads_select on public.ml_ads_ads
  for select to authenticated using (public.ml_pode_gerir_conta(account_id));

drop policy if exists ml_ads_metrics_daily_select on public.ml_ads_metrics_daily;
create policy ml_ads_metrics_daily_select on public.ml_ads_metrics_daily
  for select to authenticated using (public.ml_pode_gerir_conta(account_id));

-- De hora em hora: cada execução lê o que falta dentro do limite de tempo da função,
-- até completar os 90 dias. Campanhas são relidas uma vez por dia, depois das 10h (GMT-3).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-ads-sync') then
    perform cron.unschedule('ml-ads-sync');
  end if;
  perform cron.schedule(
    'ml-ads-sync',
    '15 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-ads-sync')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-ads-sync fica só manual: %', sqlerrm;
end $$;
