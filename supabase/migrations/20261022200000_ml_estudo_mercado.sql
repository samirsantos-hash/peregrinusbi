-- Estudo de mercado: cada estudo feito a partir de um anúncio fica guardado com a data,
-- para reabrir e comparar com o anterior. Só leitura do Mercado Livre.

create table if not exists public.ml_market_studies (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  item_id text not null,
  titulo text,
  categoria_id text,
  categoria_nome text,
  custo numeric(12,2) check (custo is null or custo >= 0),
  frete numeric(12,2) check (frete is null or frete >= 0),
  resultado jsonb not null,
  ia jsonb,
  erro_ia text,
  modelo text,
  sinais_verdes integer not null default 0,
  sinais_amarelos integer not null default 0,
  sinais_vermelhos integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists ml_market_studies_conta_idx
  on public.ml_market_studies (account_id, criado_em desc);
create index if not exists ml_market_studies_anuncio_idx
  on public.ml_market_studies (account_id, item_id, criado_em desc);

alter table public.ml_market_studies enable row level security;
grant select on public.ml_market_studies to authenticated;
grant all on public.ml_market_studies to service_role;

drop policy if exists ml_market_studies_select on public.ml_market_studies;
create policy ml_market_studies_select on public.ml_market_studies
  for select to authenticated
  using (public.ml_pode_gerir_conta(account_id));
