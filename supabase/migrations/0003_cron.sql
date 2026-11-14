-- Scheduled agent: Supabase pg_cron calls the app's job URLs with the cron secret.
-- The secret lives in Supabase Vault (name 'quants_cron_secret'), never in this file.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.call_job(p_path text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
  v_base text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'quants_cron_secret';
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'quants_base_url';
  if v_secret is null or v_base is null then return; end if;
  perform net.http_get(
    url := v_base || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function public.call_job(text) from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('quants-tick', 'quants-signals');
select cron.schedule('quants-tick', '* * * * *', $$select public.call_job('/api/cron/tick')$$);
select cron.schedule('quants-signals', '*/15 * * * *', $$select public.call_job('/api/cron/signals')$$);
