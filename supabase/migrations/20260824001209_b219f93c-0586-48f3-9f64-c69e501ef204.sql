-- =====================================================================
-- Migração 0001 — Ingestão Mercado Livre (escopo essencial)
-- =====================================================================

-- 0. Multi-tenant
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz default now()
);

-- 1. Contas ML autorizadas
create table if not exists public.ml_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  ml_user_id bigint not null,
  nickname text,
  site_id text not null default 'MLB',
  status text not null default 'active',
  last_sync_daily_at timestamptz,
  created_at timestamptz default now(),
  unique (ml_user_id)
);

-- 2. Tokens versionados (append-only)
create table if not exists public.ml_tokens (
  id bigserial primary key,
  account_id uuid not null references public.ml_accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  scope text,
  expires_at timestamptz not null,
  is_current boolean not null default true,
  created_at timestamptz default now()
);

create unique index if not exists ml_tokens_current_uidx
  on public.ml_tokens (account_id) where is_current;

-- 3. Camada RAW
create table if not exists public.stg_ml_daily_raw (
  id bigserial primary key,
  account_id uuid not null references public.ml_accounts(id),
  operation_id text not null,
  operation_type text not null,
  operation_date timestamptz not null,
  payload jsonb not null,
  payload_hash text not null,
  fetched_at timestamptz default now(),
  sync_job_id bigint,
  unique (account_id, operation_type, operation_id, payload_hash)
);

-- 4. Fato — operações por competência
create table if not exists public.fin_operations (
  id bigserial primary key,
  account_id uuid not null references public.ml_accounts(id),
  operation_id text not null,
  operation_type text not null,
  operation_date timestamptz not null,
  data_competencia date not null,
  status text,
  seller_gross_income numeric(14,2),
  total_order_amount numeric(14,2),
  total_income numeric(14,2),
  gross_price numeric(14,2),
  total_discount numeric(14,2),
  total_meli_discount numeric(14,2),
  transparent_meli_discount numeric(14,2),
  total_seller_discount numeric(14,2),
  meli_rebate numeric(14,2),
  buyer_shipping_charge numeric(14,2),
  net_costs numeric(14,2),
  pending_costs numeric(14,2),
  tax_withholding_amount numeric(14,2),
  seller_net_income numeric(14,2),
  ml_item_id text,
  sku text,
  titulo text,
  quantidade integer,
  unit_price numeric(14,2),
  sale_price numeric(14,2),
  total_price numeric(14,2),
  shipment_id text,
  shipping_logistic_type text,
  shipping_type text,
  shipping_cost numeric(14,2),
  pack_id text,
  raw_id bigint references public.stg_ml_daily_raw(id),
  ingested_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, operation_type, operation_id)
);

-- 5. Fato — custos detalhados
create table if not exists public.fin_costs (
  id bigserial primary key,
  operation_pk bigint not null references public.fin_operations(id) on delete cascade,
  account_id uuid not null,
  ml_cost_id text,
  tipo text,
  detail_type text,
  concept_type text,
  gross_amount numeric(14,2),
  total_discount numeric(14,2),
  net_cost numeric(14,2),
  remaining numeric(14,2),
  currency_id text,
  order_percentage_fee numeric(9,4),
  cost_operation_id text,
  unique (operation_pk, ml_cost_id, tipo, net_cost)
);

-- 6. Controle de sincronização
create table if not exists public.sync_jobs (
  id bigserial primary key,
  account_id uuid not null references public.ml_accounts(id),
  endpoint text not null,
  start_date date not null,
  end_date date not null,
  trilha text not null,
  status text not null default 'pending',
  attempts integer default 0,
  offset_atual integer default 0,
  total_registros integer,
  registros_gravados integer default 0,
  erro text,
  scheduled_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (account_id, endpoint, start_date, end_date, trilha)
);

-- fecha o FK solto do RAW para o job
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stg_ml_daily_raw_job_fk'
  ) then
    alter table public.stg_ml_daily_raw
      add constraint stg_ml_daily_raw_job_fk
      foreign key (sync_job_id) references public.sync_jobs(id);
  end if;
end $$;

-- índices de consulta
create index if not exists fin_operations_conta_comp_idx on public.fin_operations (account_id, data_competencia);
create index if not exists fin_costs_op_idx on public.fin_costs (operation_pk);
create index if not exists stg_ml_daily_raw_conta_idx on public.stg_ml_daily_raw (account_id, operation_date);
create index if not exists sync_jobs_status_idx on public.sync_jobs (status, scheduled_at);

-- ---------------------------------------------------------------------
-- GRANTS + RLS
-- ---------------------------------------------------------------------

-- ml_tokens: nunca exposto ao client. Apenas service_role (edge functions).
grant all on public.ml_tokens to service_role;
grant usage, select on sequence public.ml_tokens_id_seq to service_role;
alter table public.ml_tokens enable row level security;
-- (sem policies: nenhum usuário do app lê/escreve)

-- demais tabelas: leitura para admin/gerente, escrita só super_admin
grant select on public.tenants to authenticated;
grant all on public.tenants to service_role;
alter table public.tenants enable row level security;
create policy "tenants_select_admin" on public.tenants for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "tenants_write_super" on public.tenants for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.ml_accounts to authenticated;
grant all on public.ml_accounts to service_role;
alter table public.ml_accounts enable row level security;
create policy "ml_accounts_select_admin" on public.ml_accounts for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "ml_accounts_write_super" on public.ml_accounts for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.stg_ml_daily_raw to authenticated;
grant all on public.stg_ml_daily_raw to service_role;
grant usage, select on sequence public.stg_ml_daily_raw_id_seq to service_role;
alter table public.stg_ml_daily_raw enable row level security;
create policy "stg_raw_select_admin" on public.stg_ml_daily_raw for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "stg_raw_write_super" on public.stg_ml_daily_raw for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.fin_operations to authenticated;
grant all on public.fin_operations to service_role;
grant usage, select on sequence public.fin_operations_id_seq to service_role;
alter table public.fin_operations enable row level security;
create policy "fin_operations_select_admin" on public.fin_operations for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "fin_operations_write_super" on public.fin_operations for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.fin_costs to authenticated;
grant all on public.fin_costs to service_role;
grant usage, select on sequence public.fin_costs_id_seq to service_role;
alter table public.fin_costs enable row level security;
create policy "fin_costs_select_admin" on public.fin_costs for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "fin_costs_write_super" on public.fin_costs for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.sync_jobs to authenticated;
grant all on public.sync_jobs to service_role;
grant usage, select on sequence public.sync_jobs_id_seq to service_role;
alter table public.sync_jobs enable row level security;
create policy "sync_jobs_select_admin" on public.sync_jobs for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'gerente'));
create policy "sync_jobs_write_super" on public.sync_jobs for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- trigger de updated_at
drop trigger if exists trg_fin_operations_upd on public.fin_operations;
create trigger trg_fin_operations_upd before update on public.fin_operations
  for each row execute function public.update_updated_at_column();
