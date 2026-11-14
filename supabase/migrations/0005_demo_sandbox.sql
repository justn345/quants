-- Demo = sandbox. Per-network sign-up limit (hashed IP only) and automatic deletion after 48 hours.
create table if not exists public.demo_signups (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists demo_signups_idx on public.demo_signups (ip_hash, created_at desc);
alter table public.demo_signups enable row level security;
revoke all on public.demo_signups from authenticated, anon;

create or replace function public.cleanup_demo_accounts() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id in (select id from public.profiles where is_demo and created_at < now() - interval '48 hours');
  delete from public.demo_signups where created_at < now() - interval '2 days';
$$;
revoke execute on function public.cleanup_demo_accounts() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname = 'quants-demo-cleanup';
select cron.schedule('quants-demo-cleanup', '17 * * * *', $$select public.cleanup_demo_accounts()$$);
