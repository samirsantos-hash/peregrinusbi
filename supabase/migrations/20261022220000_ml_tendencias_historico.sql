-- Histórico semanal dos termos em alta do Mercado Livre (/trends).
-- O ML devolve só a semana atual (50 termos, sem volume); o painel guarda para comparar semanas.
-- Dado público do ML: leitura para consultores; a cobertura nos anúncios respeita a RLS de ml_listings.

-- escopo: id do site ("MLB" = Brasil) ou da categoria. semana: segunda-feira em São Paulo.
create table if not exists public.ml_trends_weekly (
  escopo text not null,
  semana date not null,
  posicao integer not null check (posicao between 1 and 100),
  palavra text not null,
  url text,
  grupo text not null check (grupo in ('crescimento', 'desejadas', 'populares')),
  coletado_em timestamptz not null default now(),
  primary key (escopo, semana, posicao)
);

-- Uma linha por escopo e semana coletados, inclusive quando o ML não devolveu termos.
create table if not exists public.ml_trends_coletas (
  escopo text not null,
  semana date not null,
  nome text,
  termos integer not null default 0,
  coletado_em timestamptz not null default now(),
  primary key (escopo, semana)
);

-- Categoria do anúncio → categoria (ela ou até 2 acima) que tem termos em alta.
create table if not exists public.ml_trend_categorias (
  category_id text primary key,
  nome text,
  escopo_id text,
  escopo_nome text,
  verificado_em timestamptz not null default now()
);

alter table public.ml_trends_weekly enable row level security;
alter table public.ml_trends_coletas enable row level security;
alter table public.ml_trend_categorias enable row level security;
grant select on public.ml_trends_weekly, public.ml_trends_coletas, public.ml_trend_categorias to authenticated;
grant all on public.ml_trends_weekly, public.ml_trends_coletas, public.ml_trend_categorias to service_role;

drop policy if exists ml_trends_weekly_select on public.ml_trends_weekly;
create policy ml_trends_weekly_select on public.ml_trends_weekly
  for select to authenticated using (public.ml_sou_consultor());
drop policy if exists ml_trends_coletas_select on public.ml_trends_coletas;
create policy ml_trends_coletas_select on public.ml_trends_coletas
  for select to authenticated using (public.ml_sou_consultor());
drop policy if exists ml_trend_categorias_select on public.ml_trend_categorias;
create policy ml_trend_categorias_select on public.ml_trend_categorias
  for select to authenticated using (public.ml_sou_consultor());

-- Escopos de termos em alta ligados às categorias dos anúncios ativos da conta, com quantos anúncios caem em cada um.
-- security invoker: a RLS de ml_listings limita às contas que a pessoa gerencia.
create or replace function public.ml_tendencias_escopos(p_account_id uuid)
returns table (escopo text, nome text, anuncios integer, vendidos bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select m.escopo_id, max(m.escopo_nome), count(*)::integer, coalesce(sum(l.vendidos), 0)::bigint
  from public.ml_listings l
  join public.ml_trend_categorias m on m.category_id = l.categoria_id
  where l.account_id = p_account_id and l.status = 'active' and m.escopo_id is not null
  group by m.escopo_id
  order by 4 desc, 3 desc;
$$;

revoke all on function public.ml_tendencias_escopos(uuid) from public;
grant execute on function public.ml_tendencias_escopos(uuid) to authenticated;

-- Quantos anúncios ativos da conta têm todas as palavras (3+ letras, sem acento) do termo no título.
create or replace function public.ml_tendencias_cobertura(p_account_id uuid, p_termos text[])
returns table (termo text, anuncios integer)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with termos as (
    select t.termo,
      array(
        select w from regexp_split_to_table(lower(extensions.unaccent(t.termo)), '[^a-z0-9]+') w
        where length(w) >= 3
      ) as palavras
    from unnest(p_termos[1:100]) as t(termo)
  )
  select t.termo,
    case when cardinality(t.palavras) = 0 then 0 else (
      select count(*)::integer
      from public.ml_listings l
      where l.account_id = p_account_id and l.status = 'active'
        and not exists (
          select 1 from unnest(t.palavras) p
          where lower(extensions.unaccent(coalesce(l.titulo, ''))) not like '%' || p || '%'
        )
    ) end
  from termos t;
$$;

revoke all on function public.ml_tendencias_cobertura(uuid, text[]) from public;
grant execute on function public.ml_tendencias_cobertura(uuid, text[]) to authenticated;

-- Todo dia: cada execução só busca o que ainda falta na semana.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-trends-sync') then
    perform cron.unschedule('ml-trends-sync');
  end if;
  perform cron.schedule(
    'ml-trends-sync',
    '20 10 * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-trends-sync')$cron$
  );
exception
  when others then
    raise notice 'pg_cron indisponível; ml-trends-sync fica só manual: %', sqlerrm;
end $$;
