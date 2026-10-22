-- Catálogo de anúncios ativos e pausados de cada conta conectada, para busca por título, SKU e MLB.
-- A API não documenta busca por título nos anúncios do vendedor; por isso a busca é local.

create extension if not exists unaccent with schema extensions;

create table if not exists public.ml_listings (
  item_id text primary key,
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  titulo text,
  sku text,
  skus text[] not null default '{}',
  preco numeric,
  preco_original numeric,
  moeda text,
  estoque integer,
  vendidos integer,
  status text,
  sub_status text[] not null default '{}',
  tipo_anuncio text,
  logistica text,
  frete_gratis boolean,
  catalogo boolean,
  categoria_id text,
  thumbnail text,
  link text,
  saude numeric,
  variacoes jsonb not null default '[]',
  synced_at timestamptz not null default now()
);

create index if not exists ml_listings_conta_idx on public.ml_listings (account_id, vendidos desc nulls last);
create index if not exists ml_listings_skus_idx on public.ml_listings using gin (skus);

alter table public.ml_listings enable row level security;
grant select on public.ml_listings to authenticated;
grant all on public.ml_listings to service_role;

drop policy if exists ml_listings_select on public.ml_listings;
create policy ml_listings_select on public.ml_listings
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

-- Último retrato da leitura completa por conta.
create table if not exists public.ml_listings_estado (
  account_id uuid primary key references public.ml_accounts(id) on delete cascade,
  total_ml integer,
  lidos integer,
  pendentes integer,
  completo_em timestamptz,
  synced_at timestamptz not null default now()
);

alter table public.ml_listings_estado enable row level security;
grant select on public.ml_listings_estado to authenticated;
grant all on public.ml_listings_estado to service_role;

drop policy if exists ml_listings_estado_select on public.ml_listings_estado;
create policy ml_listings_estado_select on public.ml_listings_estado
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));

-- Busca: MLB exato, SKU exato (anúncio ou variação), SKU pelo começo, ou palavras do título sem acento.
-- security invoker: a RLS de ml_listings decide o que a pessoa vê.
-- MLB aceita "MLB123…", "mlb-123…" ou só os números (8 ou mais dígitos).
create or replace function public.ml_buscar_anuncios(p_account_id uuid, p_termo text, p_limite integer default 50)
returns setof public.ml_listings
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with termo as (
    select
      trim(coalesce(p_termo, '')) as bruto,
      upper(trim(coalesce(p_termo, ''))) as maiusculo,
      upper(regexp_replace(coalesce(p_termo, ''), '[\s-]', '', 'g')) as compacto,
      regexp_split_to_array(lower(extensions.unaccent(trim(coalesce(p_termo, '')))), '\s+') as palavras
  ),
  alvo as (
    select t.*,
      case
        when t.compacto ~ '^[A-Z]{3}[0-9]{6,}$' then t.compacto
        else null
      end as mlb,
      case when t.compacto ~ '^[0-9]{8,}$' then t.compacto else null end as numero
    from termo t
  )
  select l.*
  from public.ml_listings l, alvo t
  where l.account_id = p_account_id
    and length(t.bruto) >= 2
    and (
      l.item_id = t.mlb
      or regexp_replace(l.item_id, '^[A-Z]+', '') = t.numero
      or exists (select 1 from unnest(l.skus) s where upper(s) = t.maiusculo or upper(s) like t.maiusculo || '%')
      or not exists (
        select 1 from unnest(t.palavras) p
        where p <> '' and lower(extensions.unaccent(coalesce(l.titulo, ''))) not like '%' || p || '%'
      )
    )
  order by
    (l.item_id = t.mlb or regexp_replace(l.item_id, '^[A-Z]+', '') = t.numero) desc nulls last,
    exists (select 1 from unnest(l.skus) s where upper(s) = t.maiusculo) desc,
    l.vendidos desc nulls last
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

revoke all on function public.ml_buscar_anuncios(uuid, text, integer) from public;
grant execute on function public.ml_buscar_anuncios(uuid, text, integer) to authenticated;

-- De hora em hora: cada execução lê o que falta dentro do limite de tempo da função.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-listings-sync') then
    perform cron.unschedule('ml-listings-sync');
  end if;
  perform cron.schedule(
    'ml-listings-sync',
    '25 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-listings-sync')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-listings-sync fica só manual: %', sqlerrm;
end $$;
