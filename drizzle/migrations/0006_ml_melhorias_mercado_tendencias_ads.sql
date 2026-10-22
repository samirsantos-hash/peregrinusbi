create table if not exists public.ml_listing_improvements (
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  item_id text not null, titulo text, diagnostico jsonb not null, ia jsonb, erro_ia text, modelo text,
  entrada_hash text not null, qualidade_score numeric,
  achados_altos integer not null default 0, achados_total integer not null default 0,
  origem text not null check (origem in ('manual', 'diario')),
  gerado_por uuid references auth.users(id) on delete set null,
  gerado_em timestamptz not null default now(), verificado_em timestamptz not null default now(),
  primary key (account_id, item_id));
create index if not exists ml_listing_improvements_prioridade_idx on public.ml_listing_improvements (account_id, achados_altos desc, qualidade_score asc nulls last);
grant select on public.ml_listing_improvements to authenticated;
grant all on public.ml_listing_improvements to service_role;
alter table public.ml_listing_improvements enable row level security;
drop policy if exists ml_listing_improvements_select on public.ml_listing_improvements;
create policy ml_listing_improvements_select on public.ml_listing_improvements for select to authenticated using (public.ml_pode_gerir_conta(account_id));
do $$ begin
  if exists (select 1 from cron.job where jobname = 'ml-listing-improve') then perform cron.unschedule('ml-listing-improve'); end if;
  perform cron.schedule('ml-listing-improve', '35 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-listing-improve')$cron$);
exception when others then raise notice 'pg_cron: %', sqlerrm; end $$;

create table if not exists public.ml_market_studies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  item_id text not null, titulo text, categoria_id text, categoria_nome text,
  custo numeric(12,2) check (custo is null or custo >= 0), frete numeric(12,2) check (frete is null or frete >= 0),
  resultado jsonb not null, ia jsonb, erro_ia text, modelo text,
  sinais_verdes integer not null default 0, sinais_amarelos integer not null default 0, sinais_vermelhos integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null, criado_em timestamptz not null default now());
create index if not exists ml_market_studies_conta_idx on public.ml_market_studies (account_id, criado_em desc);
create index if not exists ml_market_studies_anuncio_idx on public.ml_market_studies (account_id, item_id, criado_em desc);
grant select on public.ml_market_studies to authenticated;
grant all on public.ml_market_studies to service_role;
alter table public.ml_market_studies enable row level security;
drop policy if exists ml_market_studies_select on public.ml_market_studies;
create policy ml_market_studies_select on public.ml_market_studies for select to authenticated using (public.ml_pode_gerir_conta(account_id));

create table if not exists public.ml_trends_weekly (
  escopo text not null, semana date not null, posicao integer not null check (posicao between 1 and 100),
  palavra text not null, url text, grupo text not null check (grupo in ('crescimento', 'desejadas', 'populares')),
  coletado_em timestamptz not null default now(), primary key (escopo, semana, posicao));
create table if not exists public.ml_trends_coletas (
  escopo text not null, semana date not null, nome text, termos integer not null default 0,
  coletado_em timestamptz not null default now(), primary key (escopo, semana));
create table if not exists public.ml_trend_categorias (
  category_id text primary key, nome text, escopo_id text, escopo_nome text,
  verificado_em timestamptz not null default now());
grant select on public.ml_trends_weekly, public.ml_trends_coletas, public.ml_trend_categorias to authenticated;
grant all on public.ml_trends_weekly, public.ml_trends_coletas, public.ml_trend_categorias to service_role;
alter table public.ml_trends_weekly enable row level security;
alter table public.ml_trends_coletas enable row level security;
alter table public.ml_trend_categorias enable row level security;
drop policy if exists ml_trends_weekly_select on public.ml_trends_weekly;
create policy ml_trends_weekly_select on public.ml_trends_weekly for select to authenticated using (public.ml_sou_consultor());
drop policy if exists ml_trends_coletas_select on public.ml_trends_coletas;
create policy ml_trends_coletas_select on public.ml_trends_coletas for select to authenticated using (public.ml_sou_consultor());
drop policy if exists ml_trend_categorias_select on public.ml_trend_categorias;
create policy ml_trend_categorias_select on public.ml_trend_categorias for select to authenticated using (public.ml_sou_consultor());

create or replace function public.ml_tendencias_escopos(p_account_id uuid)
returns table (escopo text, nome text, anuncios integer, vendidos bigint)
language sql stable security invoker set search_path = public as $$
  select m.escopo_id, max(m.escopo_nome), count(*)::integer, coalesce(sum(l.vendidos), 0)::bigint
  from public.ml_listings l join public.ml_trend_categorias m on m.category_id = l.categoria_id
  where l.account_id = p_account_id and l.status = 'active' and m.escopo_id is not null
  group by m.escopo_id order by 4 desc, 3 desc;
$$;
revoke all on function public.ml_tendencias_escopos(uuid) from public;
grant execute on function public.ml_tendencias_escopos(uuid) to authenticated;

create or replace function public.ml_tendencias_cobertura(p_account_id uuid, p_termos text[])
returns table (termo text, anuncios integer)
language sql stable security invoker set search_path = public, extensions as $$
  with termos as (
    select t.termo, array(select w from regexp_split_to_table(lower(extensions.unaccent(t.termo)), '[^a-z0-9]+') w where length(w) >= 3) as palavras
    from unnest(p_termos[1:100]) as t(termo))
  select t.termo,
    case when cardinality(t.palavras) = 0 then 0 else (
      select count(*)::integer from public.ml_listings l
      where l.account_id = p_account_id and l.status = 'active'
        and not exists (select 1 from unnest(t.palavras) p where lower(extensions.unaccent(coalesce(l.titulo, ''))) not like '%' || p || '%')
    ) end
  from termos t;
$$;
revoke all on function public.ml_tendencias_cobertura(uuid, text[]) from public;
grant execute on function public.ml_tendencias_cobertura(uuid, text[]) to authenticated;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'ml-trends-sync') then perform cron.unschedule('ml-trends-sync'); end if;
  perform cron.schedule('ml-trends-sync', '20 10 * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-trends-sync')$cron$);
exception when others then raise notice 'pg_cron: %', sqlerrm; end $$;

alter table public.ml_listings add column if not exists family_id text;
alter table public.ml_listings add column if not exists catalog_product_id text;
create index if not exists ml_listings_familia_idx on public.ml_listings (account_id, family_id) where family_id is not null;
create index if not exists ml_listings_catalogo_idx on public.ml_listings (account_id, catalog_product_id) where catalog_product_id is not null;
create index if not exists ml_ads_metrics_daily_grupo_idx on public.ml_ads_metrics_daily (account_id, nivel, ad_group_id, dia);

create or replace function public.ml_ads_painel_grupos(p_account_id uuid, p_dias integer default 30)
returns table (
  ad_group_id bigint, campaign_id bigint, status text, tipo text, external_id text, titulo text,
  custo numeric, receita numeric, cliques bigint, impressoes bigint, unidades bigint, dias integer,
  custo_ant numeric, receita_ant numeric, cliques_ant bigint, impressoes_ant bigint, unidades_ant bigint, dias_ant integer,
  item_id text, thumbnail text, link text, anuncios integer, anuncios_ativos integer, estoque bigint,
  frete_gratis boolean, logistica text, preco numeric, qualidade_score numeric, qualidade_nivel text,
  fotos integer, fotos_abaixo_minimo integer, fotos_abaixo_recomendado integer, ficha_obrigatorios integer,
  achados_altos integer, analisado_em timestamptz)
language sql stable security invoker set search_path = public as $$
  with janela as (
    select (now() at time zone 'America/Sao_Paulo')::date as hoje, greatest(least(coalesce(p_dias, 30), 45), 1) as n),
  m as (
    select x.ad_group_id,
      sum(x.cost) filter (where x.dia > j.hoje - j.n) as custo,
      sum(x.total_amount) filter (where x.dia > j.hoje - j.n) as receita,
      sum(x.clicks) filter (where x.dia > j.hoje - j.n)::bigint as cliques,
      sum(x.prints) filter (where x.dia > j.hoje - j.n)::bigint as impressoes,
      sum(x.units_quantity) filter (where x.dia > j.hoje - j.n)::bigint as unidades,
      count(distinct x.dia) filter (where x.dia > j.hoje - j.n)::integer as dias,
      sum(x.cost) filter (where x.dia <= j.hoje - j.n) as custo_ant,
      sum(x.total_amount) filter (where x.dia <= j.hoje - j.n) as receita_ant,
      sum(x.clicks) filter (where x.dia <= j.hoje - j.n)::bigint as cliques_ant,
      sum(x.prints) filter (where x.dia <= j.hoje - j.n)::bigint as impressoes_ant,
      sum(x.units_quantity) filter (where x.dia <= j.hoje - j.n)::bigint as unidades_ant,
      count(distinct x.dia) filter (where x.dia <= j.hoje - j.n)::integer as dias_ant
    from public.ml_ads_metrics_daily x, janela j
    where x.account_id = p_account_id and x.nivel = 'anuncio' and x.dia > j.hoje - 2 * j.n and x.dia <= j.hoje
    group by x.ad_group_id)
  select a.ad_group_id, a.campaign_id, lower(a.status), a.ad_group_type, a.external_id, a.title,
    m.custo, m.receita, m.cliques, m.impressoes, m.unidades, coalesce(m.dias, 0),
    m.custo_ant, m.receita_ant, m.cliques_ant, m.impressoes_ant, m.unidades_ant, coalesce(m.dias_ant, 0),
    l.item_id, l.thumbnail, l.link, coalesce(g.anuncios, 0), coalesce(g.ativos, 0), g.estoque,
    l.frete_gratis, l.logistica, l.preco, i.qualidade_score, i.diagnostico #>> '{qualidade,nivel}',
    (i.diagnostico #>> '{fotos,quantidade}')::integer,
    (i.diagnostico #>> '{fotos,abaixo_minimo}')::integer,
    (i.diagnostico #>> '{fotos,abaixo_recomendado}')::integer,
    case when i.diagnostico is null then null else jsonb_array_length(coalesce(i.diagnostico #> '{ficha,obrigatorios}', '[]'::jsonb)) end,
    i.achados_altos, i.gerado_em
  from public.ml_ads_ads a
  left join m on m.ad_group_id = a.ad_group_id
  left join lateral (
    select x.item_id, x.thumbnail, x.link, x.frete_gratis, x.logistica, x.preco from public.ml_listings x
    where x.account_id = a.account_id and a.external_id is not null
      and (x.item_id = a.external_id or x.family_id = a.external_id or x.catalog_product_id = a.external_id)
    order by (x.item_id = a.external_id) desc, x.vendidos desc nulls last limit 1) l on true
  left join lateral (
    select count(*)::integer as anuncios, count(*) filter (where x.status = 'active')::integer as ativos, sum(x.estoque)::bigint as estoque
    from public.ml_listings x
    where x.account_id = a.account_id and a.external_id is not null
      and (x.item_id = a.external_id or x.family_id = a.external_id or x.catalog_product_id = a.external_id)) g on true
  left join public.ml_listing_improvements i on i.account_id = a.account_id and i.item_id = l.item_id
  where a.account_id = p_account_id
  order by m.custo desc nulls last, a.ad_group_id;
$$;
revoke all on function public.ml_ads_painel_grupos(uuid, integer) from public;
grant execute on function public.ml_ads_painel_grupos(uuid, integer) to authenticated;