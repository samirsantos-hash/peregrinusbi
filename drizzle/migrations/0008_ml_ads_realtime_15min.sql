-- lovable-cron-fallback-reviewed: o Mercado Livre não envia avisos de mudança em campanhas de Ads; só lendo periodicamente.
do $$ begin
  begin alter publication supabase_realtime add table public.ml_ads_campaigns; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.ml_ads_estado; exception when duplicate_object then null; end;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'ml-ads-sync') then
    perform cron.unschedule('ml-ads-sync');
  end if;
  perform cron.schedule(
    'ml-ads-sync',
    '*/15 * * * *',
    $cron$select public.ml_cron_refresh_tokens('https://uepfrcrlxaasvijxyqrg.supabase.co/functions/v1/ml-ads-sync')$cron$
  );
exception when others then
  raise notice 'pg_cron indisponível: %', sqlerrm;
end $$;