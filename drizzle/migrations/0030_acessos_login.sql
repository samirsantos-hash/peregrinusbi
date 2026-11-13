create table public.acessos_login (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  ip text,
  aparelho text,
  aparelho_chave text not null,
  criado_em timestamptz not null default now()
);
grant select on public.acessos_login to authenticated;
grant all on public.acessos_login to service_role;
alter table public.acessos_login enable row level security;
create policy "Master e desenvolvedor leem acessos" on public.acessos_login for select to authenticated
  using (public.is_super_admin() or public.sou_desenvolvedor());
create index acessos_login_usuario on public.acessos_login (user_id, criado_em desc);
comment on table public.acessos_login is 'Logins com IP e aparelho, guardados por 90 dias (LGPD).';