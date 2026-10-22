-- Publicidade (Product Ads): gestão e tela de trabalho.
-- O Ad Group aponta para um item (ITEM), uma família de variações (FAMILY) ou um produto de catálogo (CATALOG);
-- family_id e catalog_product_id ligam esses grupos aos anúncios da conta.

alter table public.ml_listings add column if not exists family_id text;
alter table public.ml_listings add column if not exists catalog_product_id text;

create index if not exists ml_listings_familia_idx on public.ml_listings (account_id, family_id) where family_id is not null;
create index if not exists ml_listings_catalogo_idx on public.ml_listings (account_id, catalog_product_id) where catalog_product_id is not null;
create index if not exists ml_ads_metrics_daily_grupo_idx on public.ml_ads_metrics_daily (account_id, nivel, ad_group_id, dia);

-- Um registro por Ad Group: somas do período (p_dias até hoje, em São Paulo) e do período anterior de mesmo tamanho,
-- o anúncio da conta que o representa (o próprio item; senão o mais vendido da família/produto),
-- estoque e anúncios ativos do grupo, e a última análise de melhorias desse anúncio.
-- Somas ficam null quando a API não mandou o campo em nenhum dia; "dias" diz quantos dias têm linha.
-- security invoker: as RLS de ml_ads_*, ml_listings e ml_listing_improvements decidem o que a pessoa vê.
create or replace function public.ml_ads_painel_grupos(p_account_id uuid, p_dias integer default 30)
returns table (
  ad_group_id bigint,
  campaign_id bigint,
  status text,
  tipo text,
  external_id text,
  titulo text,
  custo numeric,
  receita numeric,
  cliques bigint,
  impressoes bigint,
  unidades bigint,
  dias integer,
  custo_ant numeric,
  receita_ant numeric,
  cliques_ant bigint,
  impressoes_ant bigint,
  unidades_ant bigint,
  dias_ant integer,
  item_id text,
  thumbnail text,
  link text,
  anuncios integer,
  anuncios_ativos integer,
  estoque bigint,
  frete_gratis boolean,
  logistica text,
  preco numeric,
  qualidade_score numeric,
  qualidade_nivel text,
  fotos integer,
  fotos_abaixo_minimo integer,
  fotos_abaixo_recomendado integer,
  ficha_obrigatorios integer,
  achados_altos integer,
  analisado_em timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with janela as (
    select (now() at time zone 'America/Sao_Paulo')::date as hoje,
           greatest(least(coalesce(p_dias, 30), 45), 1) as n
  ),
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
    where x.account_id = p_account_id and x.nivel = 'anuncio'
      and x.dia > j.hoje - 2 * j.n and x.dia <= j.hoje
    group by x.ad_group_id
  )
  select
    a.ad_group_id, a.campaign_id, lower(a.status), a.ad_group_type, a.external_id, a.title,
    m.custo, m.receita, m.cliques, m.impressoes, m.unidades, coalesce(m.dias, 0),
    m.custo_ant, m.receita_ant, m.cliques_ant, m.impressoes_ant, m.unidades_ant, coalesce(m.dias_ant, 0),
    l.item_id, l.thumbnail, l.link,
    coalesce(g.anuncios, 0), coalesce(g.ativos, 0), g.estoque,
    l.frete_gratis, l.logistica, l.preco,
    i.qualidade_score,
    i.diagnostico #>> '{qualidade,nivel}',
    (i.diagnostico #>> '{fotos,quantidade}')::integer,
    (i.diagnostico #>> '{fotos,abaixo_minimo}')::integer,
    (i.diagnostico #>> '{fotos,abaixo_recomendado}')::integer,
    case when i.diagnostico is null then null else jsonb_array_length(coalesce(i.diagnostico #> '{ficha,obrigatorios}', '[]'::jsonb)) end,
    i.achados_altos,
    i.gerado_em
  from public.ml_ads_ads a
  left join m on m.ad_group_id = a.ad_group_id
  left join lateral (
    select x.item_id, x.thumbnail, x.link, x.frete_gratis, x.logistica, x.preco
    from public.ml_listings x
    where x.account_id = a.account_id and a.external_id is not null
      and (x.item_id = a.external_id or x.family_id = a.external_id or x.catalog_product_id = a.external_id)
    order by (x.item_id = a.external_id) desc, x.vendidos desc nulls last
    limit 1
  ) l on true
  left join lateral (
    select count(*)::integer as anuncios,
           count(*) filter (where x.status = 'active')::integer as ativos,
           sum(x.estoque)::bigint as estoque
    from public.ml_listings x
    where x.account_id = a.account_id and a.external_id is not null
      and (x.item_id = a.external_id or x.family_id = a.external_id or x.catalog_product_id = a.external_id)
  ) g on true
  left join public.ml_listing_improvements i on i.account_id = a.account_id and i.item_id = l.item_id
  where a.account_id = p_account_id
  order by m.custo desc nulls last, a.ad_group_id;
$$;

revoke all on function public.ml_ads_painel_grupos(uuid, integer) from public;
grant execute on function public.ml_ads_painel_grupos(uuid, integer) to authenticated;
