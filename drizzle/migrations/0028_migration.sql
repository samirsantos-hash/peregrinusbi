create table public.auth_tentativas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('login_falha','reset')),
  chave text not null,
  criado_em timestamptz not null default now()
);
grant all on public.auth_tentativas to service_role;
alter table public.auth_tentativas enable row level security;
create index auth_tentativas_busca on public.auth_tentativas (tipo, chave, criado_em desc);
comment on table public.auth_tentativas is 'Tentativas de login e de troca de senha (e-mail/IP em hash). Só as funções do servidor acessam.';