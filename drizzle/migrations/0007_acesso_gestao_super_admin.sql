insert into public.user_access_control (user_id, user_email, must_change_password, allowed_cust_ids)
select 'fd93c492-0d67-47ff-b52d-b3ea2b61f041', 'samir.santos@ecomconsult.com.br', false,
  array(select ml_user_id::text from public.ml_accounts where nickname <> 'LOJA_DEMO_SEED')
where not exists (select 1 from public.user_access_control where user_id = 'fd93c492-0d67-47ff-b52d-b3ea2b61f041');