create table public.ml_anuncios (
  item_id text primary key,
  cust_id text not null,
  titulo text,
  preco numeric,
  preco_original numeric,
  estoque integer,
  vendidos integer,
  status text,
  is_full boolean,
  frete_gratis boolean,
  link text,
  foto text,
  atualizado_em timestamptz not null default now()
);
create index on public.ml_anuncios(cust_id);
alter table public.ml_anuncios enable row level security;
grant select on public.ml_anuncios to authenticated;
grant all on public.ml_anuncios to service_role;
create policy "ver anuncios das lojas permitidas" on public.ml_anuncios for select to authenticated
using (public.is_admin() or cust_id = any(public.get_allowed_cust_ids()));