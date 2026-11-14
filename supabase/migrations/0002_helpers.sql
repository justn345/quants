-- Atomic counters (server-only, called with the service role).
create or replace function public.bump_ai_usage(p_kind text, p_failed boolean default false)
returns void language sql security definer set search_path = public as $$
  insert into public.ai_usage (day, kind, calls, failures)
  values (current_date, p_kind, 1, case when p_failed then 1 else 0 end)
  on conflict (day, kind) do update
    set calls = ai_usage.calls + 1,
        failures = ai_usage.failures + case when p_failed then 1 else 0 end;
$$;

-- Returns the new count; the caller refuses when it is above the daily cap.
create or replace function public.bump_ask_usage(p_user uuid)
returns int language sql security definer set search_path = public as $$
  insert into public.ask_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = ask_usage.count + 1
  returning count;
$$;

revoke execute on function public.bump_ai_usage(text, boolean) from public, anon, authenticated;
revoke execute on function public.bump_ask_usage(uuid) from public, anon, authenticated;

-- Latest signal per coin (used by dashboard and alerts). RLS of signals applies (public read).
create or replace view public.latest_signals with (security_invoker = true) as
select distinct on (coin) * from public.signals order by coin, created_at desc;
