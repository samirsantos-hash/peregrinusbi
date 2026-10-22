-- Central de Promoções: convites e campanhas de cada conta e a situação de cada anúncio nelas.
-- Fonte: /seller-promotions (app_version=v2). Gravado como o ML mandou; ausência fica null.
-- Desconto individual (PRICE_DISCOUNT) não aparece na lista de promoções: é lido ao vivo por anúncio.

create table if not exists public.ml_promotions (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  promotion_id text not null,
  tipo text not null,
  sub_tipo text,
  status text,
  nome text,
  inicio timestamptz,
  fim timestamptz,
  prazo timestamptz,
  beneficios jsonb,
  extras jsonb not null default '{}',
  candidatos integer,
  participando integer,
  itens_sync_em timestamptz,
  itens_completo boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (account_id, promotion_id)
);

create index if not exists ml_promotions_prazo_idx on public.ml_promotions (account_id, prazo nulls last);

alter table public.ml_promotions enable row level security;
grant select on public.ml_promotions to authenticated;
grant all on public.ml_promotions to service_role;

drop policy if exists ml_promotions_select on public.ml_promotions;
create policy ml_promotions_select on public.ml_promotions
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

create table if not exists public.ml_promotion_items (
  account_id uuid not null,
  promotion_id text not null,
  item_id text not null,
  tipo text not null,
  status text not null,
  status_item text,
  preco numeric,
  preco_original numeric,
  offer_id text,
  preco_min numeric,
  preco_max numeric,
  preco_sugerido numeric,
  meli_pct numeric,
  vendedor_pct numeric,
  estoque_min integer,
  estoque_max integer,
  inicio timestamptz,
  fim timestamptz,
  synced_at timestamptz not null default now(),
  primary key (account_id, promotion_id, item_id),
  foreign key (account_id, promotion_id) references public.ml_promotions(account_id, promotion_id) on delete cascade
);

create index if not exists ml_promotion_items_item_idx on public.ml_promotion_items (account_id, item_id);
create index if not exists ml_promotion_items_status_idx on public.ml_promotion_items (account_id, promotion_id, status);

alter table public.ml_promotion_items enable row level security;
grant select on public.ml_promotion_items to authenticated;
grant all on public.ml_promotion_items to service_role;

drop policy if exists ml_promotion_items_select on public.ml_promotion_items;
create policy ml_promotion_items_select on public.ml_promotion_items
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

-- A cada 3 horas; cada execução continua de onde parou dentro do limite de tempo da função.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-promotions-sync') then
    perform cron.unschedule('ml-promotions-sync');
  end if;
  perform cron.schedule(
    'ml-promotions-sync',
    '50 */3 * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-promotions-sync')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-promotions-sync fica só manual: %', sqlerrm;
end $$;
